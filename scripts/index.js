const snarkjs = require('snarkjs');
const PoseidonMerkleTree = require('./merkle.js');

async function generateProof() {
  try {
    console.log('[1/5] Initializing Merkle Tree...');
    const tree = new PoseidonMerkleTree(20);
    await tree.initialize();
    console.log('Merkle Tree initialized');

    console.log('[2/5] Generating test parameters...');
    const secret = "12345";
    const personalId = "67890";
    const electionId = "1";

    console.log('[3/5] Generating commitment...');
    const commitment = tree.hash([
      tree.F.e(personalId.toString()),
      tree.F.e(secret.toString())
    ]); tree.insert(commitment);
    console.log('Commitment inserted:', commitment.toString());

    console.log('[4/5] Generating Merkle proof...');
    const { pathElements, pathIndices, root } = tree.getProof(0);
    console.log('Merkle Root:', root.toString());

    const input = {
      secret: secret,
      personalId: personalId,
      pathElements: pathElements.map(x => x.toString()),
      pathIndices: pathIndices.map(x => x.toString()),
      merkleRoot: root.toString(),
      electionId: electionId
    };

    console.log('[5/5] Generating zk-SNARK proof...');
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      '../VoteCircuit_js/VoteCircuit.wasm',
      '../circuit.zkey'
    );

    console.log('\nPublic Signals:', JSON.stringify(publicSignals, null, 2));
    console.log('Proof:', JSON.stringify(proof, null, 2));

    console.log('\nVerifying proof...');
    const vKey = require('../verification_key.json');
    const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    console.log('Verification Result:', res);
  } catch (err) {
    console.error('\nERROR:', err);
    process.exit(1);
  }
}

// Execute with proper async handling
generateProof()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Unhandled rejection:', err);
    process.exit(1);
  });