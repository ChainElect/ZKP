#!/bin/bash

if ! command -v circom &> /dev/null
then
    echo "Circom is not installed. Please install it by following the instructions at: https://docs.circom.io/getting-started/installation/"
    exit 1
else
    echo "Circom is installed and ready to use!"
    exit 0
fi
