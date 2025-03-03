const { groth16 } = require('snarkjs');
const path = require('path');
const fs = require('fs');
const wc = require('../../circuits/build/Verifier_js/witness_calculator.js');

async function generateWitnessAndProof(inputs) {
    // Generate witness
    const buffer = fs.readFileSync(path.join(__dirname, '../circuits/build/Verifier_js/Verifier.wasm'));
    const witnessCalculator = await wc(buffer);
    const wtns = await witnessCalculator.calculateWTNSBin(inputs, 0);

    // Generate proof using the witness
    const { proof, publicSignals } = await groth16.prove(
        path.join(__dirname, '../build/voting_final.zkey'),
        wtns
    );

    // Save the proof and public signals
    fs.writeFileSync(
        path.join(__dirname, '../build/proof.json'),
        JSON.stringify(proof, null, 2)
    );
    fs.writeFileSync(
        path.join(__dirname, '../build/public.json'),
        JSON.stringify(publicSignals, null, 2)
    );

    // Verify the proof 
    const vKey = JSON.parse(fs.readFileSync(path.join(__dirname, '../circuits/keys/verification_key.json')).toString());
    const verified = await groth16.verify(vKey, publicSignals, proof);

    console.log('Proof verified:', verified);
    return { proof, publicSignals, verified };
}

async function main() {
    const inputs = {
        nullifier: "1234567890",
        secret: "9876543210",
        pathElements: [
            "1111111111",
            "2222222222",
            "3333333333",
            "4444444444",
            "5555555555",
            "6666666666",
            "7777777777",
            "8888888888",
            "9999999999",
            "1010101010",
            "1111111111",
            "1212121212",
            "1313131313",
            "1414141414",
            "1515151515",
            "1616161616",
            "1717171717",
            "1818181818",
            "1919191919",
            "2020202020"
        ],
        pathIndices: [
            "0",
            "1",
            "0",
            "1",
            "0",
            "1",
            "0",
            "1",
            "0",
            "1",
            "0",
            "1",
            "0",
            "1",
            "0",
            "1",
            "0",
            "1",
            "0",
            "1"
        ]
    };

    const result = await generateWitnessAndProof(inputs);
    console.log('Proof generated successfully');
}

main().catch(console.error);