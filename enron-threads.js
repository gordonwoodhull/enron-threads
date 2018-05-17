var qs = querystring.parse();

var options = Object.assign({
    data: 'data/',
    layout: 'd3v4force',
    tdur: 1000,
    r: 2,
    top: 10
}, qs);

function radius(adjacent, last, k, r, set) {
    console.assert(set.has(k));
    console.assert(k && k !== 'undefined');
    if(!r)
        return {nodes: [k], edges: []};
    var adjs = Object.keys(adjacent[k]).filter(k => k != last && set.has(k));
    var edges = adjs.map(a => ({source: k, target: a, type: 'adjacent'}));
    var crad = adjs.map(k2 => radius(adjacent, k, k2, r-1, set));
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
    .edgeArrowhead(e => e.value.type === 'adjacent' ? null : 'vee')
;

var highlighter = dc_graph.highlight_neighbors({edgeStroke: 'darkcyan'});
diagram.child('highlight-neighbors', highlighter);

function read_error(filename) {
    throw new Error("couldn't read " + options.data + filename);
}

d3.text(options.data + 'users.txt', function(error, users) {
    if(error)
        read_error("users.txt");
    var emails = {}, edges = [];
    var adjacent = {}, peopleThreads = {}, mostThreads;
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
        var nodes = ['--select an email--'].concat(mostThreads.sort());
        people.selectAll('option')
            .data(nodes, k => k)
            .enter()
            .insert('option').text(k => k);
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
        var person = this.value;
        var data = radius(adjacent, null, person, +options.r, new Set(mostThreads));
        var node_flat = dc_graph.flat_group.make(data.nodes, n => n),
            edge_flat = dc_graph.flat_group.make(data.edges, e => e.source + '->' + e.target);
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
    });
});

