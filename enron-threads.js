var qs = querystring.parse();

var options = Object.assign({
    data: 'threads/',
    layout: 'd3v4force',
    tdur: 1000,
    r: 2
}, qs);

function radius(adjacent, last, k, r) {
    if(!r)
        return {nodes: [k], edges: []};
    var adjs = Object.keys(adjacent[k]).filter(k => k != last);
    var edges = adjs.map(a => ({source: k, target: a, type: 'adjacent'}));
    var crad = adjs.map(k2 => radius(adjacent, k, k2, r-1));
    return {
        nodes: Array.prototype.concat.apply([k], crad.map(c => c.nodes)),
        edges: Array.prototype.concat.apply(edges, crad.map(c => c.edges))
    };
}

var rendered = false;
var clusterDiagram = dc_graph.diagram('#graph')
    .layoutEngine(dc_graph.spawn_engine(options.layout))
    .edgeSource(function(e) { return e.value.source; })
    .edgeTarget(function(e) { return e.value.target; })
    .transitionDuration(+options.tdur)
    .autoZoom('always')
    .zoomExtent([0.1, 5])
    .zoomDuration(0)
    .nodeRadius(7)
    .edgeArrowhead(e => e.value.type === 'adjacent' ? null : 'vee')
;

function read_error(filename) {
    throw new Error("couldn't read " + options.data + filename);
}

d3.text(options.data + 'users.txt', function(error, users) {
    if(error)
        read_error("users.txt");
    var emails = {}, edges = [];
    var adjacent = {}, peopleThreads = {};
    function read_threads(threads) {
        threads.forEach(function(t) {
            var froms = {};
            var file = t.file;
            t.hops.forEach(function(h, i) {
                emails[h.from] = true;
                if(i>0) {
                    var from = t.hops[i-1].from, to = t.hops[i].from;
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
            var nodes = Object.keys(emails).map(k => k).sort();
            people.selectAll('option')
                .data(nodes, k => k)
              .enter()
                .append('option').text(k => k);
            d3.select('#progress')
                .html((nread < users.length ? 'read ' + u : 'Done') +
                      '<br>' + nodes.length + ' addresses');
        });
    });
    people.on('change', function() {
        var person = this.value;
        var data = radius(adjacent, null, person, +options.r);
        var node_flat = dc_graph.flat_group.make(data.nodes, n => n),
            edge_flat = dc_graph.flat_group.make(data.edges, e => e.source + '->' + e.target);
        clusterDiagram
            .nodeDimension(node_flat.dimension).nodeGroup(node_flat.group)
            .edgeDimension(edge_flat.dimension).edgeGroup(edge_flat.group)
            .nodeStrokeWidth(n => n.key === person ? 3 : 1)
            .nodeStroke(n => n.key === person ? '#E34234' : 'black');
        if(rendered)
            clusterDiagram.redraw();
        else {
            rendered = true;
            clusterDiagram.render();
        }
    });
});

