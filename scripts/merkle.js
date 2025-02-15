const { buildPoseidon } = require('circomlibjs');

class PoseidonMerkleTree {
  constructor(levels = 20) {
    this.levels = levels;
    this.leaves = [];
    this.zeros = [];
    this.poseidon = null;
    this.F = null;
    this.rootHash = null;
  }

  async initialize() {
    this.poseidon = await buildPoseidon();
    this.F = this.poseidon.F;
    this.zeros = new Array(this.levels);
    
    // Initialize zero values with Poseidon(0,0)
    this.zeros[0] = this.F.e(0n);
    for (let i = 1; i < this.levels; i++) {
      const hash = this.poseidon([this.zeros[i-1], this.zeros[i-1]]);
      this.zeros[i] = this.F.e(this.F.toObject(hash));
    }
  }

  hash(values) {
    const valuesFE = values.map(v => this.F.e(v));
    return this.F.toString(this.poseidon(valuesFE));
  }

  insert(leaf) {
    const leafFE = this.F.e(leaf.toString());
    this.leaves.push(leafFE);
    this._buildTree();
  }

  _buildTree() {
    let currentLevel = [...this.leaves];
    for (let level = 0; level < this.levels; level++) {
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i+1 < currentLevel.length ? currentLevel[i+1] : this.zeros[level];
        nextLevel.push(this.poseidon([left, right]));
      }
      currentLevel = nextLevel;
    }
    this.rootHash = currentLevel[0] || this.zeros[this.levels-1];
  }

  getRoot() {
    return this.rootHash;
  }

  getProof(index) {
    const pathElements = [];
    const pathIndices = [];
    let currentIndex = index;

    for (let level = 0; level < this.levels; level++) {
      const isRight = currentIndex % 2;
      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;
      
      pathIndices.push(isRight ? 1 : 0);
      pathElements.push(
        siblingIndex < this.leaves.length 
          ? this.F.toString(this.leaves[siblingIndex], 10)
          : this.F.toString(this.zeros[level], 10)
      );
      
      currentIndex = Math.floor(currentIndex / 2);
    }

    return { 
      pathElements, 
      pathIndices, 
      root: this.F.toString(this.rootHash, 10) 
    };
  }
}

module.exports = PoseidonMerkleTree;