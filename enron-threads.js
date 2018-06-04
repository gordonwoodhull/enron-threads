var qs = querystring.parse();
var defaults = {
    data: 'data/',
    layout: 'd3v4force',
    tdur: 1000,
    r: 2,
    top: 5,
    nppl: 6,
    user: '',
    thread: ''
};
var options = Object.assign(Object.assign({}, defaults), qs);

function replace_query_string() {
    // i'm not sure why i'm not using sync-url-options.js
    var m = {};
    Object.keys(defaults).forEach(function(k) {
        if(defaults[k] != options[k]) // intentionally coercive inequality
            m[k] = options[k];
    });
    window.history.replaceState('enron-threads', null, window.location.origin + window.location.pathname +
                                '?' + decodeURIComponent(querystring.generate(m)));
}

function radius(adjacent, followed, k, r, set) {
    console.assert(set.has(k));
    console.assert(k && k !== 'undefined');
    if(!r)
        return {nodes: [k], edges: []};
    // only include emails in the top x%; don't follow an edge twice
    var adjs = Object.keys(adjacent[k]).filter(
        j => set.has(j) && (!followed[j] || !followed[j][k]));
    followed[k] = {};
    var edges = adjs.map(a => (followed[k][a] = {source: k, target: a, type: 'proximity'}));
    var crad = adjs.map(k2 => radius(adjacent, followed, k2, r-1, set));
    return {
        nodes: Array.prototype.concat.apply([k], crad.map(c => c.nodes)),
        edges: Array.prototype.concat.apply(edges, crad.map(c => c.edges))
    };
}

var starts = [], finishes = [];
var rendered = false;
var diagram = dc_graph.diagram('#graph')
    .layoutEngine(dc_graph.spawn_engine(options.layout)
                  .angleForce(.1)
                  .initialCharge(-200)
                  .chargeForce(-200)
                  .gravityStrength(0))
    .edgeSource(function(e) { return e.value.source; })
    .edgeTarget(function(e) { return e.value.target; })
    .layoutUnchanged(true) // dc-js/dc.graph.js#79
    .transitionDuration(+options.tdur)
    .autoZoom('always')
    .zoomExtent([0.1, 5])
    .zoomDuration(0)
    .nodeRadius(7)
    .nodeLabel(function(n) {
        var label = '';
        if(starts.includes(n.key))
            label += 'S';
        if(finishes.includes(n.key))
            label += 'F';
        return label;
    })
    .edgeLabel(function(e) {
        var n = e.value.forward + e.value.backward;
        return n > 1 ? n : null;
    })
    .edgeArrowhead(e => e.value.forward ? 'vee' : null)
    .edgeArrowtail(e => e.value.backward ? 'vee' : null)
    .edgeStroke(e => e.value.type === 'thread' ? 'green' : 'black')
    .edgeStrokeWidth(e => e.value.type === 'thread' ? 3 : 1)
    .edgeOpacity(e => e.value.type === 'thread' ? 0.7 : 1)
    .edgeSort(e => e.value.type) // alphabetic order!
;

var highlighter = dc_graph.highlight_neighbors({edgeStroke: 'darkorange'});
diagram.child('highlight-neighbors', highlighter);

var reader = dc_graph.path_reader()
    .elementList(thread => thread.hops)
    .elementType('node') // we have no edges, they are unused anyway
    .nodeKey(hop => hop.from);
var spliner = dc_graph.draw_spline_paths(reader, {edgeStroke: '#08a', edgeStrokeWidth: 3, edgeOpacity: 0.7}, {edgeOpacity: 1});
diagram.child('spliner', spliner);

function read_error(filename) {
    throw new Error("couldn't read " + options.data + filename);
}

d3.text(options.data + 'users.txt', function(error, users) {
    if(error)
        read_error("users.txt");
    var emails = {}, edges = [];
    var adjacent = {}, peopleThreads = {}, mostThreads;
    var followed = {}, person, proximity, selectedThreads = [];
    function read_threads(threads) {
        threads.forEach(function(t) {
            var interesting = new Set(t.hops.map(h => h.from)).size >= options.nppl;
            var froms = {};
            var file = t.file;
            t.hops.reverse(); // should reverse in data source instead
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
                if(interesting && !froms[h.from]) {
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
          .enter().insert('option')
            .text(k => k)
            .attr('selected', k => k === options.user ? 'selected' : null);
        if(options.user)
            select_person(options.user);
    }
    function update_graph_data() {
        var nodes = proximity.nodes.slice(), edges = proximity.edges.slice();
        edges.forEach(function(e) {
            e.type = 'proximity';
            e.forward = e.backward = 0;
        });
        // deep copy followed
        var followed2 = Object.entries(followed).reduce(function(p, v) {
            p[v[0]] = Object.assign({}, v[1]);
            return p;
        }, {});
        // let there be node redundancy, since this crossfilter aggregation is identity
        selectedThreads.forEach(function(thread) {
            thread.hops.forEach(function(h, i) {
                nodes.push(h.from);
                if(i>0) {
                    var s = thread.hops[i-1].from, t = thread.hops[i].from;
                    var e;
                    if(followed2[s] && (e = followed2[s][t])) {
                        e.type = 'thread';
                        ++e.forward;
                    } else if(followed2[t] && (e = followed2[t][s])) {
                        e.type = 'thread';
                        ++e.backward;
                    }
                    else {
                        e = {source: s, target: t, type: 'thread', forward: 1, backward: 0};
                        followed2[s] = followed2[s] || {};
                        edges.push(followed2[s][t] = e);
                    }
                }
            });
        });
        var node_flat = dc_graph.flat_group.make(nodes, n => n),
            edge_flat = dc_graph.flat_group.make(edges, e => e.source + '->' + e.target);
        diagram
            .nodeDimension(node_flat.dimension).nodeGroup(node_flat.group)
            .edgeDimension(edge_flat.dimension).edgeGroup(edge_flat.group)
            .nodeStrokeWidth(n => n.key === person ? 3 : 1)
            .nodeStroke(n => n.key === person ? '#E34234' : 'black');
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
    function select_person(p) {
        person = p;
        var prefixLength = peopleThreads[person][0].file.indexOf('/') + 1;
        function trim(tf) {
            return tf.slice(prefixLength);
        }
        var thread = d3.select('#threads').selectAll('div.thread-holder')
            .data(peopleThreads[person], t => t.file);
        thread
          .enter().append('div')
            .attr('class', 'thread-holder')
          .append('span')
            .attr('class', 'thread')
            .text(t => trim(t.file));
        thread.exit().remove();
        function select_thread(t, toggle) {
            console.log('clicked thread', trim(t.file), JSON.stringify(t.hops, null, 2));
            var index = selectedThreads.indexOf(t);
            var wasIn = index !== -1;
            if(toggle) {
                if(wasIn)
                    selectedThreads.splice(index, 1);
                else
                    selectedThreads.push(t);
            } else {
                if(wasIn && selectedThreads.length === 1)
                    selectedThreads = [];
                else
                    selectedThreads = [t];
            }
            thread.selectAll('span.thread')
                .classed('selected', t2 => selectedThreads.indexOf(t2) !== -1);

            starts = selectedThreads.map(t => t.hops[0].from);
            finishes = selectedThreads.map(t => t.hops[t.hops.length-1].from);
            update_graph_data();
            if(selectedThreads.length) {
                diagram.redraw();
                window.setTimeout(function() {
                    reader.data(selectedThreads);
                }, 5000);
            } else reader.data(selectedThreads);
        }
        thread.select('span.thread').on('click', function(t) {
            select_thread.call(this, t, d3.event.shiftKey);
            options.thread = selectedThreads.length ? trim(selectedThreads[0].file) : '';
            replace_query_string();
        });
        proximity = radius(adjacent, followed = {}, person, +options.r, new Set(mostThreads));
        if(selectedThreads.length) {
            selectedThreads = [];
            starts = finishes = [];
            update_graph_data();
            diagram.render();
        } else {
            update_graph_data();
            diagram.render();
            if(options.thread) {
                // urls can get mangled by e.g. word processors
                if(options.thread.slice(-1) !== '.')
                    options.thread += '.';
                var selspan = thread.select('span.thread').filter(t => trim(t.file) === options.thread);
                if(selspan.size())
                    select_thread.call(selspan.node(), selspan.datum());
                else {
                    console.warn('did not find thread', options.thread);
                    options.thread = '';
                }
                replace_query_string();
            }
        }
    }
    people.on('change', function() {
        select_person(this.value);
        options.user = this.value;
        replace_query_string();
    });
});
