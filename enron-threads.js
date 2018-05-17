var qs = querystring.parse();

var options = Object.assign({
    data: 'data/',
    layout: 'd3v4force',
    tdur: 1000,
    r: 2,
    top: 10
}, qs);

function radius(adjacent, followed, k, r, set) {
    console.assert(set.has(k));
    console.assert(k && k !== 'undefined');
    if(!r)
        return {nodes: [k], edges: []};
    // only include emails in the top x%; don't follow an edge twice
    var adjs = Object.keys(adjacent[k]).filter(
        j => set.has(j) && (!followed[j] || !followed[j][k]));
    followed[k] = {};
    adjs.forEach(j => (followed[k][j] = true));
    console.log(k, Object.keys(followed));
    var edges = adjs.map(a => ({source: k, target: a, type: 'proximity'}));
    var crad = adjs.map(k2 => radius(adjacent, followed, k2, r-1, set));
    return {
        nodes: Array.prototype.concat.apply([k], crad.map(c => c.nodes)),
        edges: Array.prototype.concat.apply(edges, crad.map(c => c.edges))
    };
}

var rendered = false;
var diagram = dc_graph.diagram('#graph')
    .layoutEngine(dc_graph.spawn_engine(options.layout))
    .edgeSource(function(e) { return e.value.source; })
    .edgeTarget(function(e) { return e.value.target; })
    .transitionDuration(+options.tdur)
    .autoZoom('always')
    .zoomExtent([0.1, 5])
    .zoomDuration(0)
    .nodeRadius(7)
    .edgeLabel(null)
    .edgeArrowhead(e => e.value.type === 'proximity' ? null : 'vee')
;

var highlighter = dc_graph.highlight_neighbors({edgeStroke: 'darkorange'});
diagram.child('highlight-neighbors', highlighter);

function read_error(filename) {
    throw new Error("couldn't read " + options.data + filename);
}

d3.text(options.data + 'users.txt', function(error, users) {
    if(error)
        read_error("users.txt");
    var emails = {}, edges = [];
    var adjacent = {}, peopleThreads = {}, mostThreads;
    var person, proximity, selectedThreads = [];
    function read_threads(threads) {
        threads.forEach(function(t) {
            var froms = {};
            var file = t.file;
            t.hops.forEach(function(h, i) {
                emails[h.from] = true;
                if(i>0) {
                    var from = t.hops[i-1].from, to = t.hops[i].from;
                    console.assert(from && to);
                    edges.push({source: from, target: to});
                    adjacent[from] = adjacent[from] || {};
                    adjacent[from][to] = true;
                    adjacent[to] = adjacent[to] || {};
                    adjacent[to][from] = true;
                }
                if(!froms[h.from]) {
                    froms[h.from] = true;
                    peopleThreads[h.from] = peopleThreads[h.from] || [];
                    peopleThreads[h.from].push(t);
                }
            });
        });
    }
    function done() {
        mostThreads = Object.keys(peopleThreads).sort(
            (a,b) => peopleThreads[a].length - peopleThreads[b].length);
        mostThreads = mostThreads
            .slice((mostThreads.length*100 - mostThreads.length*options.top)/100);
        var nodes = ['--select an email address--'].concat(mostThreads.sort());
        people.selectAll('option')
            .data(nodes, k => k)
            .enter()
            .insert('option').text(k => k);
    }
    function display_graph() {
        var nodes = proximity.nodes.slice(), edges = proximity.edges.slice();
        // let there be node/edge redundancy, since aggregation is identity
        selectedThreads.forEach(function(t) {
            t.hops.forEach(function(h, i) {
                nodes.push(h.from);
                if(i>0)
                    edges.push({source: t.hops[i-1].from, target: t.hops[i].from, type: 'thread'});
            });
        });
        var node_flat = dc_graph.flat_group.make(nodes, n => n),
            edge_flat = dc_graph.flat_group.make(edges, e => e.source + '->' + e.target);
        diagram
            .nodeDimension(node_flat.dimension).nodeGroup(node_flat.group)
            .edgeDimension(edge_flat.dimension).edgeGroup(edge_flat.group)
            .nodeStrokeWidth(n => n.key === person ? 3 : 1)
            .nodeStroke(n => n.key === person ? '#E34234' : 'black');
        if(rendered)
            diagram.redraw();
        else {
            rendered = true;
            diagram.render();
        }
    }
    var people = d3.select('#people');
    var nread = 0;
    users = users.split(/\s/).slice(0, -1);
    console.assert(users.every(u => u));
    users.forEach(function(u) {
        d3.json(options.data + u, function(error, threads) {
            if(error)
                read_error(u);
            ++nread;
            read_threads(threads);
            if(nread === users.length)
                done();
            d3.select('#progress')
                .html((nread < users.length ? 'read ' + u : 'Done') +
                      '<br>' + (nread === users.length ? 'Showing ' + mostThreads.length + '/' : '') + Object.keys(emails).length + ' addresses');
        });
    });
    people.on('change', function() {
        person = this.value;
        var prefixLength = peopleThreads[person][0].file.indexOf('/') + 1;
        var thread = d3.select('#threads').selectAll('div.thread-holder')
            .data(peopleThreads[person], t => t.file);
        thread
          .enter().append('div')
            .attr('class', 'thread-holder')
          .append('span')
            .attr('class', 'thread')
            .text(t => t.file.slice(prefixLength));
        thread.exit().remove();
        thread.select('span.thread').on('click', function(t) {
            var index = selectedThreads.indexOf(t);
            var selected = index === -1;
            d3.select(this)
                .classed('selected', selected);
            if(selected)
                selectedThreads.push(t);
            else
                selectedThreads.splice(index, 1);
            display_graph();
        });
        proximity = radius(adjacent, {}, person, +options.r, new Set(mostThreads));
        display_graph();
    });
});

