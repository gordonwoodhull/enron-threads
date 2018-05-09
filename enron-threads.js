var qs = querystring.parse();

var options = Object.assign({
    data: 'threads.json',
    layout: 'd3v4force',
    tdur: 1000,
    r: 5
}, qs);

function radius(adjacent, k, r) {
    var ret = [];
    if(r) {
        var adjs = Object.keys(adjacent[k]);
        ret = {nodes: adjs, edges: adjs.map(a => ({source: k, target: a}))};
    }
    if(r === 1)
        return ret;
    var crad = ret.nodes.map(k2 => radius(adjacent, k2, r-1));
    return {
        nodes: Array.prototype.concat.apply(ret.nodes, crad.map(c => c.nodes)),
        edges: Array.prototype.concat.apply(ret.edges, crad.map(c => c.edges))
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
;

d3.json(options.data, function(error, threads) {
    if(error)
        throw new Error("couldn't read " + options.data);
    var nodes = {}, edges = [];
    var adjacent = {}, peopleThreads = {};
    threads.forEach(function(t) {
        var froms = {};
        var file = t.file;
        t.hops.forEach(function(h, i) {
            nodes[h.from] = true;
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
    nodes = Object.keys(nodes).map(k => k);
    var people = d3.select('#people');
    people.selectAll('option')
        .data(nodes, k => k)
      .enter()
        .append('option').text(k => k);
    people.on('change', function() {
        var person = this.value;
        var data = radius(adjacent, person, +options.r);
        var node_flat = dc_graph.flat_group.make(data.nodes, n => n),
            edge_flat = dc_graph.flat_group.make(data.edges, e => e.source + '->' + e.target);
        clusterDiagram
            .nodeDimension(node_flat.dimension).nodeGroup(node_flat.group)
            .edgeDimension(edge_flat.dimension).edgeGroup(edge_flat.group);
        if(rendered)
            clusterDiagram.redraw();
        else {
            rendered = true;
            clusterDiagram.render();
        }
    });
});

