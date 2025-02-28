#!/usr/bin/env bash

# Create directories with proper permissions
mkdir -p build && chmod 755 build
mkdir -p dist && chmod 755 dist
mkdir -p contracts && chmod 755 contracts

# Give execute permissions to the current user for the contracts directory
sudo chown $(whoami) contracts
sudo chmod u+w contracts

wget -nc https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau -P ./ptau

circom test/circuits/CommitmentHasherTest.circom --wasm --r1cs -o ./build
npx snarkjs groth16 setup build/CommitmentHasherTest.r1cs ptau/powersOfTau28_hez_final_15.ptau build/CommitmentHasherTest.zkey

circom test/circuits/MerkleTreeCheckerTest.circom --wasm --r1cs -o ./build
npx snarkjs groth16 setup build/MerkleTreeCheckerTest.r1cs ptau/powersOfTau28_hez_final_15.ptau build/MerkleTreeCheckerTest.zkey

circom circuit/Verifier.circom --r1cs -o ./dist
circom circuit/Verifier.circom --wasm -o ./build

npx snarkjs groth16 setup dist/Verifier.r1cs ptau/powersOfTau28_hez_final_15.ptau build/voting_final.zkey
npx snarkjs zkey export verificationkey build/voting_final.zkey keys/verification_key.json
npx snarkjs zkey export solidityverifier build/voting_final.zkey contracts/Verifier.sol

sed -i -e 's/pragma solidity \^0.6.11/pragma solidity 0.8.17/g' contracts/Verifier.sol

npx wasm2js build/Verifier_js/Verifier.wasm -o build/Verifier.js
