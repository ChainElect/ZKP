pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom"; // Cryptographic hash function

template PoseidonTree(depth) {
    signal input leaf;
    signal input root;
    signal input pathElements[depth];
    signal input pathIndices[depth];
    
    component hashers[depth];
    signal computedPath[depth+1];
    signal left[depth];
    signal right[depth];

    // Temporary signals for the multiplications:
    signal left_tmp1[depth];
    signal left_tmp2[depth];
    signal right_tmp1[depth];
    signal right_tmp2[depth];

    computedPath[0] <== leaf;

    for (var i = 0; i < depth; i++) {
        hashers[i] = Poseidon(2);
        
        // Ensure pathIndices is binary (0 or 1)
        pathIndices[i] * (1 - pathIndices[i]) === 0;

        left_tmp1[i] <== pathIndices[i] * pathElements[i];
        left_tmp2[i] <== (1 - pathIndices[i]) * computedPath[i];
        left[i] <== left_tmp1[i] + left_tmp2[i];
        
        right_tmp1[i] <== (1 - pathIndices[i]) * pathElements[i];
        right_tmp2[i] <== pathIndices[i] * computedPath[i];
        right[i] <== right_tmp1[i] + right_tmp2[i];

        hashers[i].inputs[0] <== left[i];
        hashers[i].inputs[1] <== right[i];
        
        computedPath[i+1] <== hashers[i].out;
    }
    
    root === computedPath[depth];
}

// Rest of the circuit remains unchanged
template VoteCircuit() {
    // Inputs (private = hidden, public = visible)
    signal input secret;       // Private: Random number from user
    signal input personalId;   // Private: National ID
    signal input pathElements[20]; // Merkle Tree path (private)
    signal input pathIndices[20];  // Merkle Tree indices (private)
    signal input merkleRoot;   // Public: Root of the Merkle Tree
    signal input electionId;   // Public: Election identifier

    // Outputs
    signal output nullifier;   // Public: Unique ID to prevent double voting

    // 1. Hash the (personalId + secret) to create a "commitment"
    component hasher = Poseidon(2);
    hasher.inputs[0] <== personalId;
    hasher.inputs[1] <== secret;
    signal commitment <== hasher.out;

    // 2. Check if commitment is in the Merkle Tree
    component tree = PoseidonTree(20); // Tree with 20 levels (1 million voters)
    tree.leaf <== commitment;
    tree.root <== merkleRoot;

    for (var i = 0; i < 20; i++) {
        tree.pathElements[i] <== pathElements[i];
        tree.pathIndices[i] <== pathIndices[i];
    }

    // 3. Generate nullifier (hash of personalId + electionId)
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== personalId;
    nullifierHasher.inputs[1] <== electionId;
    nullifier <== nullifierHasher.out;
}

// Main entry point for compilation
component main = VoteCircuit();