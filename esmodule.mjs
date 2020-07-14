export default class SourceWalker {
  constructor(options = {}) {
    const { parser, ...opts } = { ...options };

    this.parserOptions = {
      plugins: [
        "jsx",
        opts.typescript ? "typescript" : "flow",
        "doExpressions",
        "importMeta",
        "bigInt",
        "objectRestSpread",
        ["decorators", { decoratorsBeforeExport: true }],
        "classProperties",
        "exportDefaultFrom",
        "exportNamespaceFrom",
        "asyncGenerators",
        "functionBind",
        "functionSent",
        "dynamicImport",
        "optionalChaining",
        "nullishCoalescingOperator",
        "topLevelAwait",
      ],
      sourceType: "module",
      strictMode: true,
      allowHashBang: true,
      allowAwaitOutsideFunction: true,
      ...opts,
    };

    this.parser = parser;

    // We use global state to stop the recursive traversal of the AST
    this.shouldStop = false;
  }

  parse(src, options) {
    const opts = { ...this.parserOptions, ...options };

    // Keep around for consumers of parse that supply their own options
    if (typeof opts.allowHashBang === "undefined") {
      opts.allowHashBang = true;
    }

    return this.parser.parse(src, opts);
  }

  traverse(node, cb) {
    if (this.shouldStop) {
      return;
    }

    if (Array.isArray(node)) {
      for (let i = 0, l = node.length; i < l; i++) {
        const x = node[i];
        if (x !== null) {
          // Mark that the node has been visited
          x.parent = node;
          this.traverse(x, cb);
        }
      }
    } else if (node && typeof node === "object") {
      cb(node);

      for (let key in node) {
        // Avoid visited nodes
        if (key === "parent" || !node[key]) {
          continue;
        }

        node[key].parent = node;
        this.traverse(node[key], cb);
      }
    }
  }

  walk(src, cb) {
    this.shouldStop = false;

    const ast = typeof src === "object" ? src : this.parse(src);

    this.traverse(ast, cb);
  }

  moonwalk(node, cb) {
    this.shouldStop = false;

    if (typeof node !== "object") {
      throw new Error("node must be an object");
    }

    reverseTraverse.call(this, node, cb);
  }

  stopWalking() {
    this.shouldStop = true;
  }
}

function reverseTraverse(node, cb) {
  if (this.shouldStop || !node.parent) {
    return;
  }

  if (node.parent instanceof Array) {
    for (let i = 0, l = node.parent.length; i < l; i++) {
      cb(node.parent[i]);
    }
  } else {
    cb(node.parent);
  }

  reverseTraverse.call(this, node.parent, cb);
}
