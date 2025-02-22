pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";

template switchPosition() {
    signal input in[2];
    signal input s;
    signal output out[2];

    s * (1 - s) === 0;
    out[0] <== (in[1] - in[0]) * s + in[0];
    out[1] <== (in[0] - in[1]) * s + in[1];
}

template CommitmentHasher() {
    signal input personalId;
    signal input secret;
    signal output commitment;
    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== personalId;
    poseidon.inputs[1] <== secret;
    commitment <== poseidon.out;
}

template NullifierHasher() {
    signal input root;
    signal input personalId;
    signal input secret;
    signal input proposalId;
    signal output nullifier;
    component poseidon = Poseidon(4);
    poseidon.inputs[0] <== root;
    poseidon.inputs[1] <== personalId;
    poseidon.inputs[2] <== secret;
    poseidon.inputs[3] <== proposalId;
    nullifier <== poseidon.out;
}

template VoteHasher() {
    signal input personalId;
    signal input secret;
    signal input vote;
    signal output hashedVote;
    component poseidon = Poseidon(3);
    poseidon.inputs[0] <== personalId;
    poseidon.inputs[1] <== secret;
    poseidon.inputs[2] <== vote;
    hashedVote <== poseidon.out;
}

template ProveVote(levels) {
    // Public inputs
    signal input root;
    signal input proposalId;

    // Private inputs
    signal input personalId;
    signal input secret;
    signal input vote;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    // Outputs
    signal output nullifier;
    signal output hashedVote;

    // Compute commitment (leaf)
    component commitmentHasher = CommitmentHasher();
    commitmentHasher.personalId <== personalId;
    commitmentHasher.secret <== secret;

    signal leaf;
    leaf <== commitmentHasher.commitment;

    // Verify Merkle proof
    component selectors[levels];
    component hashers[levels];
    signal computedPath[levels];

    for (var i = 0; i < levels; i++) {
        selectors[i] = switchPosition();
        selectors[i].in[0] <== (i == 0) ? leaf : computedPath[i - 1];
        selectors[i].in[1] <== pathElements[i];
        selectors[i].s <== pathIndices[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== selectors[i].out[0];
        hashers[i].inputs[1] <== selectors[i].out[1];
        computedPath[i] <== hashers[i].out;
    }

    // Verify root matches
    computedPath[levels - 1] === root;

    // Compute nullifier
    component nullifierHasher = NullifierHasher();
    nullifierHasher.root <== root;
    nullifierHasher.personalId <== personalId;
    nullifierHasher.secret <== secret;
    nullifierHasher.proposalId <== proposalId;
    nullifier <== nullifierHasher.nullifier;

    // Compute hashed vote
    component voteHasher = VoteHasher();
    voteHasher.personalId <== personalId;
    voteHasher.secret <== secret;
    voteHasher.vote <== vote;
    hashedVote <== voteHasher.hashedVote;
}

component main {public [root, proposalId]} = ProveVote(20);