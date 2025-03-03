#!/bin/bash

# Exit on error
set -e

# Variable to store the name of the circuit
CIRCUIT='voting'
FOLDER_PATH='keys'
BUILD='build'
PTAU=16

# Create all necessary directories
mkdir -p ${FOLDER_PATH} ${BUILD}/${CIRCUIT}_js ptau ../contracts

# In case there is a circuit name as an input
if [ "$1" ]; then
    CIRCUIT=$1
fi

# In case there is a ptau file number as an input
if [ "$2" ]; then
    PTAU=$2
fi

# Check if the necessary ptau file exists
if [ -f ./ptau/powersOfTau28_hez_final_${PTAU}.ptau ]; then
    echo "----- powersOfTau28_hez_final_${PTAU}.ptau already exists -----"
else
    echo "----- Download powersOfTau28_hez_final_${PTAU}.ptau -----"
    wget -P ./ptau https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_${PTAU}.ptau
fi

# Check if r1cs file exists
if [ ! -f ${BUILD}/${CIRCUIT}.r1cs ]; then
    echo "Error: ${BUILD}/${CIRCUIT}.r1cs file not found"
    echo "Please compile your circuit first"
    exit 1
fi

echo "----- Generate .zkey file (Proving key) -----"
# Generate a .zkey file that will contain the proving and verification keys together with all phase 2 contributions
snarkjs groth16 setup ${BUILD}/${CIRCUIT}.r1cs ptau/powersOfTau28_hez_final_${PTAU}.ptau ${FOLDER_PATH}/${CIRCUIT}_0000.zkey

echo "----- Contribute to the phase 2 of the ceremony -----"
# Contribute to the phase 2 of the ceremony
snarkjs zkey contribute ${FOLDER_PATH}/${CIRCUIT}_0000.zkey ${FOLDER_PATH}/${CIRCUIT}_final.zkey --name="1st Contributor Name" -v -e="some random text"

echo "----- Export the verification key -----"
# Export the verification key
snarkjs zkey export verificationkey ${FOLDER_PATH}/${CIRCUIT}_final.zkey ${FOLDER_PATH}/verification_key.json

# Copy keys to build directory
echo "----- Copying keys to build directory -----"
cp ${FOLDER_PATH}/${CIRCUIT}_final.zkey ${BUILD}/
cp ${FOLDER_PATH}/verification_key.json ${BUILD}/

# Initialize proof generation flag
PROOF_GENERATED=false

# Generate witness helper script
cat > ${BUILD}/${CIRCUIT}_js/generate_witness.sh << EOL
#!/bin/bash
node generate_witness.js ${CIRCUIT}.wasm ../input.json witness.wtns
EOL
chmod +x ${BUILD}/${CIRCUIT}_js/generate_witness.sh

# Check if witness file exists
if [ ! -f ${BUILD}/${CIRCUIT}_js/witness.wtns ]; then
    echo "Warning: witness.wtns file not found. Skipping proof generation."
    echo "To generate witness, run:"
    echo "cd ${BUILD}/${CIRCUIT}_js && ./generate_witness.sh"
else
    echo "----- Generate zk-proof -----"
    # Generate a zk-proof associated to the circuit and the witness
    snarkjs groth16 prove ${FOLDER_PATH}/${CIRCUIT}_final.zkey ${BUILD}/${CIRCUIT}_js/witness.wtns ${FOLDER_PATH}/proof.json ${FOLDER_PATH}/public.json

    echo "----- Verify the proof -----"
    # Verify the proof
    snarkjs groth16 verify ${FOLDER_PATH}/verification_key.json ${FOLDER_PATH}/public.json ${FOLDER_PATH}/proof.json
    PROOF_GENERATED=true
fi

echo "----- Generate Solidity verifier -----"
# Generate a Solidity verifier
snarkjs zkey export solidityverifier ${FOLDER_PATH}/${CIRCUIT}_final.zkey ${CIRCUIT}Verifier.sol

# Update the Solidity verifier (macOS compatible sed commands)
sed -i '' 's/0.6.11;/0.8.4;/g' ${CIRCUIT}Verifier.sol
CIRCUIT_CAP=$(echo "${CIRCUIT}" | tr '[:lower:]' '[:upper:]' | cut -c1)$(echo "${CIRCUIT}" | cut -c2-)
sed -i '' "s/contract Verifier/contract ${CIRCUIT_CAP}Verifier/g" ${CIRCUIT}Verifier.sol

# Move the verifier to contracts folder
echo "----- Moving verifier to contracts directory -----"
if [ -f "${CIRCUIT}Verifier.sol" ]; then
    mv "${CIRCUIT}Verifier.sol" "../contracts/" || {
        echo "Error: Failed to move verifier file to contracts directory"
        exit 1
    }
else
    echo "Error: Verifier file not found"
    exit 1
fi

echo "----- Generate and print parameters of call -----"
# Generate and print parameters of call only if proof was generated
if [ "$PROOF_GENERATED" = true ]; then
    (cd "${FOLDER_PATH}" && snarkjs generatecall | tee parameters.txt) || {
        echo "Error generating call parameters"
        exit 1
    }
else
    echo "Skipping parameters generation - no proof was generated"
    echo "First generate a witness file and proof to get call parameters"
fi

echo "----- Process completed successfully -----"
 The script is responsible for generating the proving key, contributing to the phase 2 of the ceremony, exporting the verification key, generating a zk-proof, verifying the proof, generating a Solidity verifier, and generating and printing the parameters of the call. 
 The script is executed by running the following command: 
 bash 03_executePOT.sh 
 The script will generate the proving key, contribute to the phase 2 of the ceremony, export the verification key, generate a zk-proof, verify the proof, generate a Solidity verifier, and generate and print the parameters of the call. 
 The script will also generate a  parameters.txt  file that contains the parameters of the call. 
 The script will output the following message: 
 ----- Generate .zkey file (Proving key) -----