# 🗳️ ZKP Voting System – ChainElect

This repository contains the zero-knowledge proof (ZKP) components of the ChainElect decentralized voting system. It includes Circom circuits, setup scripts, and utilities for compiling, proving, and verifying votes while preserving voter privacy.

---

## 🔐 Overview

ChainElect leverages **Zero-Knowledge Proofs** to enable anonymous, tamper-proof voting. This repo focuses on the cryptographic logic and infrastructure used to:

- Generate zkSNARK circuits (using Circom)
- Compile and export proof and verifier logic
- Enable on-chain and off-chain vote verification

---

## 📁 Repo Structure

- [`circuits/`](https://github.com/ChainElect/ZKP/tree/main/circuits) – Circom files (e.g. `vote.circom`)
- [`inputs/`](https://github.com/ChainElect/ZKP/tree/main/inputs) – Sample JSON input files
- [`proofs/`](https://github.com/ChainElect/ZKP/tree/main/proofs) – Generated proofs and public signals
- [`scripts/`](https://github.com/ChainElect/ZKP/tree/main/scripts) – Shell/JS scripts for compilation & proof generation
- [`verifier/`](https://github.com/ChainElect/ZKP/tree/main/verifier) – Solidity verifier contracts
- [`keys/`](https://github.com/ChainElect/ZKP/tree/main/keys) – ZKey files and trusted setup artifacts

---

## ⚙️ Getting Started

### 🔧 Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [Circom](https://docs.circom.io/getting-started/installation/)
- [SnarkJS](https://github.com/iden3/snarkjs)
- (Optional) Docker for isolated environment

---

### 🧪 Compile & Generate Proof

```bash
# Compile the circuit
circom circuits/vote.circom --r1cs --wasm --sym -o build/

# Generate trusted setup
snarkjs groth16 setup build/vote.r1cs powersOfTau28_hez_final_10.ptau keys/vote_0000.zkey

# Contribute to phase 2 (optional)
snarkjs zkey contribute keys/vote_0000.zkey keys/vote_final.zkey --name="Your Name"

# Export verifier
snarkjs zkey export solidityverifier keys/vote_final.zkey verifier/VoteVerifier.sol

# Generate a proof
snarkjs groth16 prove keys/vote_final.zkey inputs/input.json proofs/proof.json proofs/public.json

# Verify the proof
snarkjs groth16 verify verification_key.json proofs/public.json proofs/proof.json
