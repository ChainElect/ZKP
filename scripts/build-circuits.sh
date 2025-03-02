#!/bin/bash

# Create necessary directories
mkdir -p circuits/build/Verifier_js
mkdir -p circuits/build/MerkleTreeCheckerTest_js
mkdir -p circuits/build/CommitmentHasherTest_js

# Compile circuits
circom circuits/circuit/Verifier.circom --r1cs --wasm -o circuits/build
circom circuits/circuit/MerkleTreeChecker.circom --r1cs --wasm -o circuits/build/MerkleTreeCheckerTest_js
circom circuits/circuit/CommitmentHasher.circom --r1cs --wasm -o circuits/build/CommitmentHasherTest_js

# Generate zkey files
snarkjs groth16 setup circuits/build/Verifier.r1cs circuits/ptau/pot12_final.ptau circuits/build/Verifier.zkey
snarkjs groth16 setup circuits/build/MerkleTreeCheckerTest_js/MerkleTreeChecker.r1cs circuits/ptau/pot12_final.ptau circuits/build/MerkleTreeCheckerTest.zkey
snarkjs groth16 setup circuits/build/CommitmentHasherTest_js/CommitmentHasher.r1cs circuits/ptau/pot12_final.ptau circuits/build/CommitmentHasherTest.zkey

# Export verification keys
snarkjs zkey export verificationkey circuits/build/Verifier.zkey circuits/build/Verifier_vkey.json
snarkjs zkey export verificationkey circuits/build/MerkleTreeCheckerTest.zkey circuits/build/MerkleTreeCheckerTest_vkey.json
snarkjs zkey export verificationkey circuits/build/CommitmentHasherTest.zkey circuits/build/CommitmentHasherTest_vkey.json 