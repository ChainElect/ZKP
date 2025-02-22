const { buildPoseidon } = require('circomlibjs');

class PoseidonMerkleTree {
    constructor(levels = 20) {
        this.levels = levels;
        this.leaves = [];
        this.zeros = [];
        this.poseidon = null;
        this.F = null;
        this.root = null;
    }

    async initialize() {
        this.poseidon = await buildPoseidon();
        this.F = this.poseidon.F;
        this.zeros = new Array(this.levels);

        // Initialize zero values
        this.zeros[0] = BigInt(0);
        for (let i = 1; i < this.levels; i++) {
            // Fix: Pass proper BigInt values to poseidon hash function
            const hash = this.poseidon([this.zeros[i - 1], this.zeros[i - 1]]);
            this.zeros[i] = this.F.toObject(hash);
        }
    }

    insert(leaf) {
        // Convert leaf to proper format if it's not already
        const leafBigInt = typeof leaf === 'string' ? BigInt(leaf) : leaf;
        this.leaves.push(leafBigInt);
        this._buildTree();
    }

    _buildTree() {
        let currentLevel = [...this.leaves];
        for (let level = 0; level < this.levels; level++) {
            const nextLevel = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : this.zeros[level];
                const hash = this.poseidon([left, right]);
                nextLevel.push(this.F.toObject(hash));
            }
            currentLevel = nextLevel;
        }
        this.root = currentLevel[0] || this.zeros[this.levels - 1];
    }

    getProof(index) {
        let pathElements = [];
        let pathIndices = [];
        let currentIndex = index;

        for (let level = 0; level < this.levels; level++) {
            const siblingIndex = currentIndex ^ 1;
            if (siblingIndex < this.leaves.length) {
                pathElements.push(this.leaves[siblingIndex].toString());
            } else {
                pathElements.push(this.zeros[level].toString());
            }
            pathIndices.push(currentIndex % 2);
            currentIndex = Math.floor(currentIndex / 2);
        }

        return {
            pathElements,
            pathIndices,
            root: this.root.toString()
        };
    }

    getHeight() {
        return this.levels;
    }
}

module.exports = PoseidonMerkleTree;