
let wasm;

const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let heap_next = heap.length;

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

function _assertBoolean(n) {
    if (typeof(n) !== 'boolean') {
        throw new Error('expected a boolean argument');
    }
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    if (typeof(heap_next) !== 'number') throw new Error('corrupt heap');

    heap[idx] = obj;
    return idx;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

let WASM_VECTOR_LEN = 0;

let cachedTextEncoder = new TextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (typeof(arg) !== 'string') throw new Error('expected a string argument');

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);
        if (ret.read !== arg.length) throw new Error('failed to pass whole string');
        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
        cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory0;
}

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            if (--state.cnt === 0) {
                wasm.__wbindgen_export_2.get(state.dtor)(a, state.b);

            } else {
                state.a = a;
            }
        }
    };
    real.original = state;

    return real;
}

function logError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        let error = (function () {
            try {
                return e instanceof Error ? `${e.message}\n\nStack:\n${e.stack}` : e.toString();
            } catch(_) {
                return "<failed to stringify thrown value>";
            }
        }());
        console.error("wasm-bindgen: imported JS function that was not marked as `catch` threw an error:", error);
        throw e;
    }
}

function _assertNum(n) {
    if (typeof(n) !== 'number') throw new Error('expected a number argument');
}
function __wbg_adapter_22(arg0, arg1, arg2) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hb4f6db36e17570c1(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_25(arg0, arg1) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm._dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h07d56922b0f63c9a(arg0, arg1);
}

let cachegetUint32Memory0 = null;
function getUint32Memory0() {
    if (cachegetUint32Memory0 === null || cachegetUint32Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint32Memory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachegetUint32Memory0;
}

function getArrayU32FromWasm0(ptr, len) {
    return getUint32Memory0().subarray(ptr / 4, ptr / 4 + len);
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
    return instance.ptr;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_exn_store(addHeapObject(e));
    }
}

function notDefined(what) { return () => { throw new Error(`${what} is not defined`); }; }

function getArrayU8FromWasm0(ptr, len) {
    return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}
function __wbg_adapter_126(arg0, arg1, arg2, arg3) {
    _assertNum(arg0);
    _assertNum(arg1);
    wasm.wasm_bindgen__convert__closures__invoke2_mut__h7112b0be1ccebcf0(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
}

/**
*/
export class Cluster {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

    static __wrap(ptr) {
        const obj = Object.create(Cluster.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_cluster_free(ptr);
    }
    /**
    * @returns {Network}
    */
    get network() {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        var ret = wasm.cluster_network(this.ptr);
        return Network.__wrap(ret);
    }
    /**
    * @returns {NodeIdentity}
    */
    addNode() {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        var ret = wasm.cluster_addNode(this.ptr);
        return NodeIdentity.__wrap(ret);
    }
    /**
    * @param {NodeIdentity} id
    * @param {Snapshot} snapshot
    * @returns {PlaygroundNode}
    */
    recoverNode(id, snapshot) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        _assertClass(id, NodeIdentity);
        if (id.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        _assertClass(snapshot, Snapshot);
        if (snapshot.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        var ret = wasm.cluster_recoverNode(this.ptr, id.ptr, snapshot.ptr);
        return PlaygroundNode.__wrap(ret);
    }
    /**
    * @param {NodeIdentity} id
    * @param {Snapshot} snapshot
    * @returns {PlaygroundNode}
    */
    resumeNode(id, snapshot) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        _assertClass(id, NodeIdentity);
        if (id.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        _assertClass(snapshot, Snapshot);
        if (snapshot.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        var ret = wasm.cluster_resumeNode(this.ptr, id.ptr, snapshot.ptr);
        return PlaygroundNode.__wrap(ret);
    }
    /**
    * @param {NodeIdentity} id
    * @returns {PlaygroundNode}
    */
    startNode(id) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        _assertClass(id, NodeIdentity);
        if (id.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        var ret = wasm.cluster_startNode(this.ptr, id.ptr);
        return PlaygroundNode.__wrap(ret);
    }
}
/**
*/
export class ClusterBuilder {

    static __wrap(ptr) {
        const obj = Object.create(ClusterBuilder.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_clusterbuilder_free(ptr);
    }
    /**
    * @param {any} callbacks
    */
    constructor(callbacks) {
        var ret = wasm.clusterbuilder_new(addHeapObject(callbacks));
        return ClusterBuilder.__wrap(ret);
    }
    /**
    * @param {number} v
    */
    setDefaultPacketLoss(v) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        wasm.clusterbuilder_setDefaultPacketLoss(this.ptr, v);
    }
    /**
    * @param {number} mean
    * @param {number} std_dev
    */
    setDefaultE2eDelay(mean, std_dev) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        wasm.clusterbuilder_setDefaultE2eDelay(this.ptr, mean, std_dev);
    }
    /**
    * @param {number} concurrency
    */
    setInitialConcurrency(concurrency) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        _assertNum(concurrency);
        wasm.clusterbuilder_setInitialConcurrency(this.ptr, concurrency);
    }
    /**
    * @returns {Cluster}
    */
    build() {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        const ptr = this.__destroy_into_raw();
        _assertNum(ptr);
        var ret = wasm.clusterbuilder_build(ptr);
        return Cluster.__wrap(ret);
    }
}
/**
*/
export class Configuration {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

    static __wrap(ptr) {
        const obj = Object.create(Configuration.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_configuration_free(ptr);
    }
    /**
    */
    get concurrency() {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        var ret = wasm.__wbg_get_configuration_concurrency(this.ptr);
        return ret >>> 0;
    }
    /**
    */
    get heartbeatIntervalMs() {
        try {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertNum(this.ptr);
            wasm.__wbg_get_configuration_heartbeatIntervalMs(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return r0 === 0 ? undefined : r1 >>> 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    get leaderHeartbeatIntervalMs() {
        try {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertNum(this.ptr);
            wasm.__wbg_get_configuration_leaderHeartbeatIntervalMs(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return r0 === 0 ? undefined : r1 >>> 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    get ensureLeadershipIntervalMs() {
        try {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertNum(this.ptr);
            wasm.__wbg_get_configuration_ensureLeadershipIntervalMs(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return r0 === 0 ? undefined : r1 >>> 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    get autofillDelayMs() {
        try {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertNum(this.ptr);
            wasm.__wbg_get_configuration_autofillDelayMs(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            return r0 === 0 ? undefined : r1 >>> 0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
    */
    get autofillBatchSize() {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        var ret = wasm.__wbg_get_configuration_autofillBatchSize(this.ptr);
        return ret >>> 0;
    }
    /**
    * @returns {Uint32Array}
    */
    get nodes() {
        try {
            if (this.ptr == 0) throw new Error('Attempt to use a moved value');
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            _assertNum(this.ptr);
            wasm.configuration_nodes(retptr, this.ptr);
            var r0 = getInt32Memory0()[retptr / 4 + 0];
            var r1 = getInt32Memory0()[retptr / 4 + 1];
            var v0 = getArrayU32FromWasm0(r0, r1).slice();
            wasm.__wbindgen_free(r0, r1 * 4);
            return v0;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}
/**
*/
export class Network {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

    static __wrap(ptr) {
        const obj = Object.create(Network.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_network_free(ptr);
    }
    /**
    * @param {number} from
    * @param {number} to
    * @param {number} packet_loss
    * @returns {Promise<any>}
    */
    setPacketLoss(from, to, packet_loss) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        _assertNum(from);
        _assertNum(to);
        var ret = wasm.network_setPacketLoss(this.ptr, from, to, packet_loss);
        return takeObject(ret);
    }
    /**
    * @param {number} from
    * @param {number} to
    * @param {number} mean
    * @param {number} std_dev
    * @returns {Promise<any>}
    */
    setE2eDelay(from, to, mean, std_dev) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        _assertNum(from);
        _assertNum(to);
        var ret = wasm.network_setE2eDelay(this.ptr, from, to, mean, std_dev);
        return takeObject(ret);
    }
}
/**
*/
export class NodeIdentity {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

    static __wrap(ptr) {
        const obj = Object.create(NodeIdentity.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_nodeidentity_free(ptr);
    }
    /**
    * @returns {number}
    */
    id() {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        var ret = wasm.nodeidentity_id(this.ptr);
        return ret >>> 0;
    }
}
/**
*/
export class Nodes {

    static __wrap(ptr) {
        const obj = Object.create(Nodes.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_nodes_free(ptr);
    }
    /**
    */
    constructor() {
        var ret = wasm.nodes_new();
        return Nodes.__wrap(ret);
    }
    /**
    * @param {NodeIdentity} node
    * @returns {Nodes}
    */
    push(node) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        const ptr = this.__destroy_into_raw();
        _assertNum(ptr);
        _assertClass(node, NodeIdentity);
        if (node.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        var ret = wasm.nodes_push(ptr, node.ptr);
        return Nodes.__wrap(ret);
    }
}
/**
*/
export class PlaygroundNode {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

    static __wrap(ptr) {
        const obj = Object.create(PlaygroundNode.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_playgroundnode_free(ptr);
    }
    /**
    */
    crash() {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        const ptr = this.__destroy_into_raw();
        _assertNum(ptr);
        wasm.playgroundnode_crash(ptr);
    }
    /**
    */
    shutDown() {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        const ptr = this.__destroy_into_raw();
        _assertNum(ptr);
        wasm.playgroundnode_shutDown(ptr);
    }
    /**
    */
    takeSnapshot() {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        wasm.playgroundnode_takeSnapshot(this.ptr);
    }
    /**
    * @param {number} min_round
    * @param {number} max_round
    * @param {number} num
    */
    queueAppends(min_round, max_round, num) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        _assertNum(min_round);
        _assertNum(max_round);
        _assertNum(num);
        wasm.playgroundnode_queueAppends(this.ptr, min_round, max_round, num);
    }
    /**
    * @param {any} new_configuration
    */
    reconfigure(new_configuration) {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        wasm.playgroundnode_reconfigure(this.ptr, addHeapObject(new_configuration));
    }
}
/**
*/
export class Snapshot {

    constructor() {
        throw new Error('cannot invoke `new` directly');
    }

    static __wrap(ptr) {
        const obj = Object.create(Snapshot.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_snapshot_free(ptr);
    }
    /**
    */
    get nodeId() {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        var ret = wasm.__wbg_get_snapshot_nodeId(this.ptr);
        return ret >>> 0;
    }
    /**
    */
    get round() {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        var ret = wasm.__wbg_get_snapshot_round(this.ptr);
        return ret >>> 0;
    }
    /**
    * @returns {boolean}
    */
    get resumable() {
        if (this.ptr == 0) throw new Error('Attempt to use a moved value');
        _assertNum(this.ptr);
        var ret = wasm.snapshot_resumable(this.ptr);
        return ret !== 0;
    }
}

async function load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

async function init(input) {
    if (typeof input === 'undefined') {
        input = new URL('playground_wasm_bg.wasm', import.meta.url);
    }
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_nodes_e52bb30abf7c6b36 = function() { return logError(function (arg0) {
        var ret = getObject(arg0).nodes;
        _assertClass(ret, Nodes);
        if (ret.ptr === 0) {
            throw new Error('Attempt to use a moved value');
        }
        var ptr0 = ret.ptr;
        ret.ptr = 0;
        return ptr0;
    }, arguments) };
    imports.wbg.__wbg_concurrency_8caee20336e952f7 = function() { return logError(function (arg0) {
        var ret = getObject(arg0).concurrency;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_heartbeatIntervalMs_ada8680a92de9889 = function() { return logError(function (arg0, arg1) {
        var ret = getObject(arg1).heartbeatIntervalMs;
        if (!isLikeNone(ret)) {
            _assertNum(ret);
        }
        getInt32Memory0()[arg0 / 4 + 1] = isLikeNone(ret) ? 0 : ret;
        getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
    }, arguments) };
    imports.wbg.__wbg_leaderHeartbeatIntervalMs_6b05df05602065b5 = function() { return logError(function (arg0, arg1) {
        var ret = getObject(arg1).leaderHeartbeatIntervalMs;
        if (!isLikeNone(ret)) {
            _assertNum(ret);
        }
        getInt32Memory0()[arg0 / 4 + 1] = isLikeNone(ret) ? 0 : ret;
        getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
    }, arguments) };
    imports.wbg.__wbg_ensureLeadershipIntervalMs_3f79391dba912e19 = function() { return logError(function (arg0, arg1) {
        var ret = getObject(arg1).ensureLeadershipIntervalMs;
        if (!isLikeNone(ret)) {
            _assertNum(ret);
        }
        getInt32Memory0()[arg0 / 4 + 1] = isLikeNone(ret) ? 0 : ret;
        getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
    }, arguments) };
    imports.wbg.__wbg_autofillDelayMs_76f08ce340ef90a2 = function() { return logError(function (arg0, arg1) {
        var ret = getObject(arg1).autofillDelayMs;
        if (!isLikeNone(ret)) {
            _assertNum(ret);
        }
        getInt32Memory0()[arg0 / 4 + 1] = isLikeNone(ret) ? 0 : ret;
        getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
    }, arguments) };
    imports.wbg.__wbg_autofillBatchSize_97e04b59304a6060 = function() { return logError(function (arg0) {
        var ret = getObject(arg0).autofillBatchSize;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_apply_a6bb829de31171f9 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
        try {
            getObject(arg0).apply(arg1 >>> 0, arg2 >>> 0, getStringFromWasm0(arg3, arg4), arg5 >>> 0);
        } finally {
            wasm.__wbindgen_free(arg3, arg4);
        }
    }, arguments) };
    imports.wbg.__wbg_autofill_c180f57268cd36a2 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).autofill(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_commit_0578e056222439ef = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        try {
            getObject(arg0).commit(arg1 >>> 0, arg2 >>> 0, getStringFromWasm0(arg3, arg4));
        } finally {
            wasm.__wbindgen_free(arg3, arg4);
        }
    }, arguments) };
    imports.wbg.__wbg_e2eDelayUpdated_b3f331652da19ece = function() { return logError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).e2eDelayUpdated(arg1 >>> 0, arg2 >>> 0, arg3, arg4);
    }, arguments) };
    imports.wbg.__wbg_ensureLeadership_3150b49a76d85f58 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).ensureLeadership(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_heartbeat_9982cc70b83dec9c = function() { return logError(function (arg0, arg1) {
        getObject(arg0).heartbeat(arg1 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_newLeader_2abf5cdfcedc7472 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).newLeader(arg1 >>> 0, arg2 === 0 ? undefined : arg3 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_newSnapshot_156bf2d350c9ff87 = function() { return logError(function (arg0, arg1) {
        getObject(arg0).newSnapshot(Snapshot.__wrap(arg1));
    }, arguments) };
    imports.wbg.__wbg_packet_3c40444d1ebea9f0 = function() { return logError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        let v0;
        if (arg5 !== 0) {
            v0 = getStringFromWasm0(arg5, arg6).slice();
            wasm.__wbindgen_free(arg5, arg6 * 1);
        }
        getObject(arg0).packet(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 !== 0, v0);
    }, arguments) };
    imports.wbg.__wbg_packetLossUpdated_f8ac908abf1afc0d = function() { return logError(function (arg0, arg1, arg2, arg3) {
        getObject(arg0).packetLossUpdated(arg1 >>> 0, arg2 >>> 0, arg3);
    }, arguments) };
    imports.wbg.__wbg_participationChanged_3905c6cd9649f9da = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).participationChanged(arg1 >>> 0, arg2 !== 0);
    }, arguments) };
    imports.wbg.__wbg_reconfigured_970b597e2f8d6273 = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).reconfigured(arg1 >>> 0, Configuration.__wrap(arg2));
    }, arguments) };
    imports.wbg.__wbg_statusChanged_92f6f6797e9c8ad5 = function() { return logError(function (arg0, arg1, arg2, arg3) {
        try {
            getObject(arg0).statusChanged(arg1 >>> 0, getStringFromWasm0(arg2, arg3));
        } finally {
            wasm.__wbindgen_free(arg2, arg3);
        }
    }, arguments) };
    imports.wbg.__wbindgen_cb_drop = function(arg0) {
        const obj = takeObject(arg0).original;
        if (obj.cnt-- == 1) {
            obj.a = 0;
            return true;
        }
        var ret = false;
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbg_setTimeout_290c28f3580809b6 = function() { return handleError(function (arg0, arg1) {
        var ret = setTimeout(getObject(arg0), arg1);
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_clearTimeout_d8b36ad8fa330187 = typeof clearTimeout == 'function' ? clearTimeout : notDefined('clearTimeout');
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        var ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_now_5fa0ca001e042f8a = function() { return logError(function (arg0) {
        var ret = getObject(arg0).now();
        return ret;
    }, arguments) };
    imports.wbg.__wbindgen_is_object = function(arg0) {
        const val = getObject(arg0);
        var ret = typeof(val) === 'object' && val !== null;
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbindgen_is_string = function(arg0) {
        var ret = typeof(getObject(arg0)) === 'string';
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbg_msCrypto_d003eebe62c636a9 = function() { return logError(function (arg0) {
        var ret = getObject(arg0).msCrypto;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_crypto_2bc4d5b05161de5b = function() { return logError(function (arg0) {
        var ret = getObject(arg0).crypto;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_getRandomValues_99bbe8a65f4aef87 = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).getRandomValues(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_static_accessor_NODE_MODULE_bdc5ca9096c68aeb = function() { return logError(function () {
        var ret = module;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_require_edfaedd93e302925 = function() { return handleError(function (arg0, arg1, arg2) {
        var ret = getObject(arg0).require(getStringFromWasm0(arg1, arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_randomFillSync_378e02b85af41ab6 = function() { return handleError(function (arg0, arg1, arg2) {
        getObject(arg0).randomFillSync(getArrayU8FromWasm0(arg1, arg2));
    }, arguments) };
    imports.wbg.__wbg_process_5729605ce9d34ea8 = function() { return logError(function (arg0) {
        var ret = getObject(arg0).process;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_versions_531e16e1a776ee97 = function() { return logError(function (arg0) {
        var ret = getObject(arg0).versions;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_node_18b58a160b60d170 = function() { return logError(function (arg0) {
        var ret = getObject(arg0).node;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_newnoargs_f579424187aa1717 = function() { return logError(function (arg0, arg1) {
        var ret = new Function(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_call_89558c3e96703ca1 = function() { return handleError(function (arg0, arg1) {
        var ret = getObject(arg0).call(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_call_94697a95cb7e239c = function() { return handleError(function (arg0, arg1, arg2) {
        var ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_new_4beacc9c71572250 = function() { return logError(function (arg0, arg1) {
        try {
            var state0 = {a: arg0, b: arg1};
            var cb0 = (arg0, arg1) => {
                const a = state0.a;
                state0.a = 0;
                try {
                    return __wbg_adapter_126(a, state0.b, arg0, arg1);
                } finally {
                    state0.a = a;
                }
            };
            var ret = new Promise(cb0);
            return addHeapObject(ret);
        } finally {
            state0.a = state0.b = 0;
        }
    }, arguments) };
    imports.wbg.__wbg_resolve_4f8f547f26b30b27 = function() { return logError(function (arg0) {
        var ret = Promise.resolve(getObject(arg0));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_then_a6860c82b90816ca = function() { return logError(function (arg0, arg1) {
        var ret = getObject(arg0).then(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_globalThis_d61b1f48a57191ae = function() { return handleError(function () {
        var ret = globalThis.globalThis;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_self_e23d74ae45fb17d1 = function() { return handleError(function () {
        var ret = self.self;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_window_b4be7f48b24ac56e = function() { return handleError(function () {
        var ret = window.window;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_global_e7669da72fd7f239 = function() { return handleError(function () {
        var ret = global.global;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_new_e3b800e570795b3c = function() { return logError(function (arg0) {
        var ret = new Uint8Array(getObject(arg0));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_newwithlength_5f4ce114a24dfe1e = function() { return logError(function (arg0) {
        var ret = new Uint8Array(arg0 >>> 0);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_subarray_a68f835ca2af506f = function() { return logError(function (arg0, arg1, arg2) {
        var ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_length_30803400a8f15c59 = function() { return logError(function (arg0) {
        var ret = getObject(arg0).length;
        _assertNum(ret);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_set_5b8081e9d002f0df = function() { return logError(function (arg0, arg1, arg2) {
        getObject(arg0).set(getObject(arg1), arg2 >>> 0);
    }, arguments) };
    imports.wbg.__wbg_get_8bbb82393651dd9c = function() { return handleError(function (arg0, arg1) {
        var ret = Reflect.get(getObject(arg0), getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_is_undefined = function(arg0) {
        var ret = getObject(arg0) === undefined;
        _assertBoolean(ret);
        return ret;
    };
    imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
        var ret = getObject(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbg_buffer_5e74a88a1424a2e0 = function() { return logError(function (arg0) {
        var ret = getObject(arg0).buffer;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
        var ret = debugString(getObject(arg1));
        var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbindgen_memory = function() {
        var ret = wasm.memory;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper11574 = function() { return logError(function (arg0, arg1, arg2) {
        var ret = makeMutClosure(arg0, arg1, 283, __wbg_adapter_22);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_closure_wrapper11760 = function() { return logError(function (arg0, arg1, arg2) {
        var ret = makeMutClosure(arg0, arg1, 297, __wbg_adapter_25);
        return addHeapObject(ret);
    }, arguments) };

    if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
        input = fetch(input);
    }



    const { instance, module } = await load(await input, imports);

    wasm = instance.exports;
    init.__wbindgen_wasm_module = module;

    return wasm;
}

export default init;

