/**
 * Wallet Context for zkLogin Sui Integration
 * Provides wallet connection state and methods throughout the app
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { 
  generateNonce, 
  generateRandomness,
  jwtToAddress,
} from '@mysten/sui/zklogin';
import { jwtDecode } from 'jwt-decode';

// Google OAuth config
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const REDIRECT_URI = typeof window !== 'undefined' ? window.location.origin : '';

// Sui client for mainnet
const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  provider: 'google' | 'facebook' | 'twitch' | null;
  userInfo: {
    email?: string;
    name?: string;
    picture?: string;
  } | null;
}

interface WalletContextType extends WalletState {
  connect: (provider: 'google' | 'facebook' | 'twitch') => Promise<void>;
  disconnect: () => void;
  suiClient: SuiClient;
}

const WalletContext = createContext<WalletContextType | null>(null);

// Storage keys
const STORAGE_KEYS = {
  ephemeralKeyPair: 'zklogin_ephemeral_keypair',
  randomness: 'zklogin_randomness',
  maxEpoch: 'zklogin_max_epoch',
  jwt: 'zklogin_jwt',
  address: 'zklogin_address',
  userInfo: 'zklogin_user_info',
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    error: null,
    provider: null,
    userInfo: null,
  });

  // Restore session on mount
  useEffect(() => {
    const storedAddress = localStorage.getItem(STORAGE_KEYS.address);
    const storedUserInfo = localStorage.getItem(STORAGE_KEYS.userInfo);
    
    if (storedAddress) {
      setState(prev => ({
        ...prev,
        address: storedAddress,
        isConnected: true,
        userInfo: storedUserInfo ? JSON.parse(storedUserInfo) : null,
      }));
    }

    // Handle OAuth callback
    handleOAuthCallback();
  }, []);

  // Handle OAuth redirect callback
  const handleOAuthCallback = async () => {
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.substring(1));
    const idToken = params.get('id_token');
    
    if (!idToken) return;

    setState(prev => ({ ...prev, isConnecting: true }));

    try {
      // Decode JWT to get user info
      const decoded: any = jwtDecode(idToken);
      
      // Get stored ephemeral keypair and randomness
      const storedKeyPair = localStorage.getItem(STORAGE_KEYS.ephemeralKeyPair);
      const storedRandomness = localStorage.getItem(STORAGE_KEYS.randomness);
      
      if (!storedKeyPair || !storedRandomness) {
        throw new Error('Session expired. Please try again.');
      }

      // Derive zkLogin address
      const userSalt = BigInt('0'); // In production, use a unique salt per user
      const zkLoginAddress = jwtToAddress(idToken, userSalt);

      // Save session
      localStorage.setItem(STORAGE_KEYS.jwt, idToken);
      localStorage.setItem(STORAGE_KEYS.address, zkLoginAddress);
      
      const userInfo = {
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      };
      localStorage.setItem(STORAGE_KEYS.userInfo, JSON.stringify(userInfo));

      setState({
        address: zkLoginAddress,
        isConnected: true,
        isConnecting: false,
        error: null,
        provider: 'google',
        userInfo,
      });

      // Clear URL hash
      window.history.replaceState(null, '', window.location.pathname);
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message || 'Failed to complete sign in',
      }));
    }
  };

  // Connect wallet using zkLogin
  const connect = useCallback(async (provider: 'google' | 'facebook' | 'twitch') => {
    if (!GOOGLE_CLIENT_ID) {
      setState(prev => ({
        ...prev,
        error: 'Google Client ID not configured. Add VITE_GOOGLE_CLIENT_ID to .env',
      }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Generate ephemeral keypair
      const ephemeralKeyPair = new Ed25519Keypair();
      const randomness = generateRandomness();
      
      // Get current epoch from Sui
      const { epoch } = await suiClient.getLatestSuiSystemState();
      const maxEpoch = Number(epoch) + 10; // Valid for ~10 epochs

      // Generate nonce
      const nonce = generateNonce(
        ephemeralKeyPair.getPublicKey(),
        maxEpoch,
        randomness
      );

      // Store for later use
      localStorage.setItem(STORAGE_KEYS.ephemeralKeyPair, JSON.stringify(ephemeralKeyPair.getSecretKey()));
      localStorage.setItem(STORAGE_KEYS.randomness, randomness);
      localStorage.setItem(STORAGE_KEYS.maxEpoch, maxEpoch.toString());

      // Build OAuth URL
      let authUrl = '';
      
      if (provider === 'google') {
        const params = new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          redirect_uri: REDIRECT_URI,
          response_type: 'id_token',
          scope: 'openid email profile',
          nonce: nonce,
        });
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      }
      // Add other providers as needed

      // Redirect to OAuth
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('Connect error:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message || 'Failed to connect wallet',
      }));
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    // Clear all stored data
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      provider: null,
      userInfo: null,
    });
  }, []);

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect, suiClient }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export default WalletContext;
