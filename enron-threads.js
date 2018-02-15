var qs = querystring.parse();

var options = Object.assign({
    data: 'threads.json',
    layout: 'd3v4-force'
}, qs);

var clusterDiagram = dc_graph.diagram('#graph');

d3.json(options.data, function(error, threads) {
    if(error)
        throw new Error("couldn't read " + options.data);
    var nodes = {}, edges = [];
    threads.forEach(function(t) {
        t.senders.forEach(function(s, i) {
            nodes[s] = true;
            if(i>0)
                edges.push({source: t.senders[i-1], target: s});
        });
    });
    var node_flat = dc_graph.flat_group(Object.keys(nodes), n => n),
        edge_flat = dc_graph.flat_group(edges, e => e.source + '->' + e.target);
    clusterDiagram
        .nodeDimension(node_flat.dimension).nodeGroup(node_flat.group)
        .edgeDimension(edge_flat.dimension).edgeGroup(edge_flat.group)
        .engine(dc_graph.spawn_engine(options.layout));
});

