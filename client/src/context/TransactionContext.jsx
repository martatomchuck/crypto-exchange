import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { contractABI, contractAddress } from '../utils/constants';

export const TransactionContext = React.createContext();

// window.ethereum is accessible when the MetaMask is set in the browser
const { ethereum } = window;

// this function is going to fetch our Ethereum contract
const getEthereumContract = async () => {
    const provider = new ethers.BrowserProvider(ethereum);
    // const provider = new ethers.providers.Web3Provider(ethereum);
    // Web3Provider is now deprecated in version 6
    
    // getSigner() returns a Promise (await required)
    const signer = await provider.getSigner();

    // const provider = new ethers.providers.Web3Provider(ethereum);
    // const signer = provider.getSigner();

    // ingredients to fetch our contract: address, abi, signer
    // const ethersContract = new ethers.Contract(address, abi, signerOrProvider);
    const transactionContract = new ethers.Contract(contractAddress, contractABI, signer);
    transactionContract.connect(signer);

    console.log({
        provider,
        signer,
        transactionContract
    });

    return transactionContract;
}

export const TransactionProvider = ({children}) => {
    const [currentAccount, setCurrentAccount] = useState('');
    const [formData, setFormData] = useState({
        addressTo: '', 
        amount: '', 
        keyword: '', 
        message: ''
    });
    const [isLoading, setIsLoading] = useState(false); 
    const [transactionCount, setTransactionCount] = useState(localStorage.getItem('transactionCount'));

    const handleChange = (e, name) => {
        // React related: get previous state and update it with a new name
        setFormData((prevState) => ({...prevState, [name]: e.target.value}))
    }

    const checkIfWalletIsConnected = async () => {

        try {
            // there is no ethereum object (MetaMask is not installed in the browser)
            if(!ethereum) return alert('Please install MetaMask');
            
            // to get MetaMask connected accounts
            // eth_accounts returns a list of addresses for the accounts owned by the user (array of strings)
            // eth_accounts simply returns an array containing the Metamask addresses currently connected to our dApp (it does not open MetaMask for the user)
            const accounts = await ethereum.request({ method: 'eth_accounts'});
            console.log(accounts);

            if(accounts.length) {
                setCurrentAccount(accounts[0]);

                //getAllTransactions();
            } else {
                console.log('No accounts found.');
            }
        } 
        catch (error) {
            console.log(error);
            throw new Error("No Ethereum object.");
        }
    }

    const connectWallet = async () => {
        try {
            // check if MetaMask is installed
            if(!ethereum) return alert('Please install MetaMask');
            // request MetaMask accounts (eth_requestAccounts opens Metamask for the user to connect their wallet)
            const accounts = await ethereum.request({ method: 'eth_requestAccounts'});
            setCurrentAccount(accounts[0]);
            window.location.reload();
        }
        catch (error) {
            console.log(error);
            throw new Error("No Ethereum object.");
        }
    }

    // all logic for sending and storing transactions
    const sendTransactions = async () => {
        try {
            if(!ethereum) return alert('Please install MetaMask');

            // get the data from the form to the transaction context
            const { addressTo, amount, keyword, message } = formData;

            const transactionContract = getEthereumContract();
            const parsedAmount = ethers.parseEther(amount); // parseEther - to parse decimal amount into Gwei hexadecimal amount

            // sending ETH from one address to another
            await ethereum.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: currentAccount,
                    to: addressTo,
                    gas: '0x5208', // 21000 Gwei = 0.000021 ETH
                    value: parsedAmount._hex, // amount is a decimal number, has to be converted to gwei
                }]
            });

            // storing transaction on the blockchain
            const transactionHash = await transactionContract.delegateCall.addToBlockchain(addressTo, parsedAmount, keyword, message);

            setIsLoading(true);
            console.log(`Loading - ${transactionHash.hash}`);
            await transactionHash.wait();
            setIsLoading(false);
            console.log(`Success - ${transactionHash.hash}`);

            const transactionCount = await transactionContract.getTransactionCount();
            setTransactionCount(transactionCount.toNumber());

        } catch (error) {
            console.log(error);
        }
    }

    useEffect(() => {
        checkIfWalletIsConnected();
    }, []);

    return ( 
        <TransactionContext.Provider 
            value={{ 
                connectWallet, 
                currentAccount, 
                formData, 
                setFormData, 
                handleChange, 
                sendTransactions 
            }}
        >
            {children}
        </TransactionContext.Provider>
    )
}