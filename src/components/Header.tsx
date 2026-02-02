import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';

export const Header: React.FC = () => {
  const { address, isConnected, isConnecting, connect, disconnect, userInfo, error } = useWallet();
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="bg-cetus-card/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo - responsive */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-cetus-primary to-cetus-accent flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-white">Cetus Liquidity Simulator</h1>
              <p className="text-[10px] sm:text-xs text-gray-400 hidden sm:block">CLMM Position Calculator & IL Analyzer</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            {/* Network Badge */}
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-sm font-medium text-green-400">Mainnet</span>
            </div>

            {/* Cetus Link */}
            <a
              href="https://app.cetus.zone/pools"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-cetus-primary/20 border border-cetus-primary/30 rounded-lg hover:bg-cetus-primary/30 transition-colors"
            >
              <svg className="w-4 h-4 text-cetus-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="text-sm font-medium text-cetus-accent">Open Cetus</span>
            </a>

            {/* Wallet Connect Button */}
            {isConnected ? (
              <div className="relative">
                <button
                  onClick={() => setShowWalletMenu(!showWalletMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-cetus-accent/20 border border-cetus-accent/30 rounded-lg hover:bg-cetus-accent/30 transition-colors"
                >
                  {userInfo?.picture && (
                    <img src={userInfo.picture} alt="" className="w-5 h-5 rounded-full" />
                  )}
                  <span className="text-sm font-medium text-cetus-accent">{formatAddress(address!)}</span>
                  <svg className="w-4 h-4 text-cetus-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showWalletMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-cetus-card border border-gray-700 rounded-lg shadow-xl z-50">
                    <div className="p-4 border-b border-gray-700">
                      <p className="text-xs text-gray-400">Connected as</p>
                      <p className="text-sm text-white font-medium truncate">{userInfo?.email || formatAddress(address!)}</p>
                      <p className="text-xs text-gray-500 mt-1 font-mono">{formatAddress(address!)}</p>
                    </div>
                    <button
                      onClick={() => {
                        disconnect();
                        setShowWalletMenu(false);
                      }}
                      className="w-full p-3 text-left text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => connect('google')}
                disabled={isConnecting}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cetus-primary to-cetus-accent rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span className="text-sm font-medium text-white">Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="text-sm font-medium text-white">Sign in with Google</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {/* Mobile Wallet Status */}
            {isConnected ? (
              <button
                onClick={() => setShowWalletMenu(!showWalletMenu)}
                className="flex items-center gap-1 px-2 py-1.5 bg-cetus-accent/20 border border-cetus-accent/30 rounded-lg"
              >
                {userInfo?.picture && (
                  <img src={userInfo.picture} alt="" className="w-5 h-5 rounded-full" />
                )}
                <span className="text-xs font-medium text-cetus-accent">{formatAddress(address!)}</span>
              </button>
            ) : (
              <button
                onClick={() => connect('google')}
                disabled={isConnecting}
                className="flex items-center gap-1 px-2 py-1.5 bg-gradient-to-r from-cetus-primary to-cetus-accent rounded-lg disabled:opacity-50"
              >
                {isConnecting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
              </button>
            )}
            
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden mt-4 pt-4 border-t border-gray-700 space-y-3">
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 w-fit">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-sm font-medium text-green-400">Mainnet</span>
            </div>
            
            <a
              href="https://app.cetus.zone/pools"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-cetus-primary/20 border border-cetus-primary/30 rounded-lg hover:bg-cetus-primary/30 transition-colors w-full"
            >
              <svg className="w-4 h-4 text-cetus-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span className="text-sm font-medium text-cetus-accent">Open Cetus Pools</span>
            </a>

            {isConnected && (
              <button
                onClick={() => {
                  disconnect();
                  setShowMobileMenu(false);
                }}
                className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors w-full"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Disconnect Wallet
              </button>
            )}
          </div>
        )}

        {/* Mobile Wallet Menu */}
        {showWalletMenu && isConnected && (
          <div className="md:hidden mt-4 pt-4 border-t border-gray-700">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-400">Connected as</p>
              <p className="text-sm text-white font-medium truncate">{userInfo?.email || formatAddress(address!)}</p>
              <p className="text-xs text-gray-500 mt-1 font-mono">{address}</p>
            </div>
            <button
              onClick={() => {
                disconnect();
                setShowWalletMenu(false);
              }}
              className="w-full mt-3 p-3 text-center text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Error Toast */}
      {error && (
        <div className="absolute top-full left-0 right-0 bg-red-500/10 border-b border-red-500/30 px-4 py-2">
          <p className="text-sm text-red-400 text-center">{error}</p>
        </div>
      )}
    </header>
  );
};

export default Header;
