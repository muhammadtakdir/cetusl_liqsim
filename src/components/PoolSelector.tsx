import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  fetchPopularPoolsFast,
  loadAllPoolsInBackground,
  searchPools,
  getPoolsCacheInfo,
  PoolInfo,
  formatPrice,
  fetchUserPositions,
  POPULAR_POOL_IDS,
} from '../services/cetusSdk';
import { useWallet } from '../contexts/WalletContext';

interface PoolSelectorProps {
  selectedPoolId: string;
  onSelectPool: (pool: PoolInfo) => void;
}

export const PoolSelector: React.FC<PoolSelectorProps> = ({
  selectedPoolId,
  onSelectPool,
}) => {
  const { isConnected, address } = useWallet();
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [userPools, setUserPools] = useState<PoolInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingUserPools, setLoadingUserPools] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [, setUsingFallback] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [activeTab, setActiveTab] = useState<'popular' | 'search' | 'my-pools'>('popular');
  const [totalPoolsLoaded, setTotalPoolsLoaded] = useState(0);

  // Refresh cache info periodically during background load
  const updateCacheInfo = useCallback(() => {
    const cacheInfo = getPoolsCacheInfo();
    setTotalPoolsLoaded(cacheInfo.count);
    if (cacheInfo.count > pools.length) {
      // Update pools from cache
      const { pools: cachedPools } = cacheInfo;
      if (cachedPools) {
        setPools(cachedPools);
      }
    }
    return cacheInfo.isLoading;
  }, [pools.length]);

  // Fetch pools on mount - FAST INITIAL LOAD
  useEffect(() => {
    let isMounted = true;
    let pollInterval: number | null = null;

    const loadPools = async () => {
      setLoading(true);
      setUsingFallback(false);
      setLoadingProgress('Loading popular pools...');
      
      try {
        // Step 1: Load popular pools FAST
        const popularPools = await fetchPopularPoolsFast();
        
        if (!isMounted) return;
        
        setPools(popularPools);
        setTotalPoolsLoaded(popularPools.length);
        setLoading(false);
        
        // Auto-select first pool if none selected
        if (!selectedPoolId && popularPools.length > 0) {
          onSelectPool(popularPools[0]);
        }
        
        // Step 2: Load remaining pools in background
        setLoadingMore(true);
        setLoadingProgress('Loading more pools...');
        
        loadAllPoolsInBackground().then(allPools => {
          if (!isMounted) return;
          setPools(allPools);
          setTotalPoolsLoaded(allPools.length);
          setLoadingMore(false);
          setLoadingProgress('');
        });
        
        // Poll for cache updates during background load
        pollInterval = window.setInterval(() => {
          if (!isMounted) return;
          const stillLoading = updateCacheInfo();
          if (!stillLoading && pollInterval) {
            clearInterval(pollInterval);
            setLoadingMore(false);
            setLoadingProgress('');
          }
        }, 1000);
        
      } catch (err) {
        console.error('Failed to fetch pools:', err);
        if (isMounted) {
          setUsingFallback(true);
          setLoadingProgress('');
          setLoading(false);
        }
      }
    };

    loadPools();
    
    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  // Fetch user's pools when connected
  useEffect(() => {
    const loadUserPools = async () => {
      if (!isConnected || !address) {
        setUserPools([]);
        return;
      }

      setLoadingUserPools(true);
      try {
        const positions = await fetchUserPositions(address);
        setUserPools(positions);
      } catch (err) {
        console.error('Failed to fetch user positions:', err);
      } finally {
        setLoadingUserPools(false);
      }
    };

    loadUserPools();
  }, [isConnected, address]);

  // Get popular pools (top 3)
  const popularPools = useMemo(() => {
    return pools.filter(p => POPULAR_POOL_IDS.includes(p.poolId)).slice(0, 3);
  }, [pools]);

  // Filter pools based on search using the optimized search function
  const filteredPools = useMemo(() => {
    if (!searchQuery) return pools;
    return searchPools(searchQuery);
  }, [pools, searchQuery]);

  // Show limited pools unless "show all" is clicked
  const displayedPools = showAll ? filteredPools : filteredPools.slice(0, 10);

  const selectedPool = pools.find(p => p.poolId === selectedPoolId);

  // Pool card component
  const PoolCard: React.FC<{ pool: PoolInfo; isUserPool?: boolean }> = ({ pool, isUserPool }) => (
    <button
      onClick={() => onSelectPool(pool)}
      className={`w-full p-3 rounded-lg border transition-all duration-200 text-left ${
        selectedPoolId === pool.poolId
          ? 'border-cetus-accent bg-cetus-accent/10'
          : 'border-gray-700 hover:border-cetus-primary bg-gray-800/50'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Token Icons */}
          <div className="flex -space-x-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-xs font-bold border-2 border-gray-800">
              {pool.coinSymbolA.charAt(0)}
            </div>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-xs font-bold border-2 border-gray-800">
              {pool.coinSymbolB.charAt(0)}
            </div>
          </div>
          
          <div>
            <span className="font-medium text-white text-sm sm:text-base">{pool.formattedName}</span>
            <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-gray-500">
              <span className="px-1 sm:px-1.5 py-0.5 bg-gray-700/50 rounded">
                {(pool.feeRate * 100).toFixed(2)}%
              </span>
              {isUserPool && (
                <span className="px-1 sm:px-1.5 py-0.5 bg-cetus-accent/20 text-cetus-accent rounded">
                  Your Pool
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-right text-[10px] sm:text-xs">
          <p className="text-cetus-accent font-medium">${formatPrice(pool.currentPrice)}</p>
          <p className="text-gray-500 hidden sm:block">Tick: {pool.currentTickIndex}</p>
        </div>
      </div>
    </button>
  );

  return (
    <div className="bg-cetus-card rounded-xl p-4 sm:p-6 card-glow">
      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2 flex-wrap">
        <svg className="w-5 h-5 text-cetus-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        Select Pool
        {!loading && (
          <span className="text-[10px] sm:text-xs text-gray-400 font-normal ml-1 sm:ml-2">
            ({totalPoolsLoaded} pools{loadingMore && '...'})
          </span>
        )}
        {loadingMore && (
          <span className="text-[10px] text-cetus-accent animate-pulse">
            Loading more...
          </span>
        )}
      </h3>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-800/50 rounded-lg p-1">
        <button
          onClick={() => { setActiveTab('popular'); setSearchQuery(''); }}
          className={`flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
            activeTab === 'popular' 
              ? 'bg-cetus-accent/20 text-cetus-accent' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          ⭐ Popular
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
            activeTab === 'search' 
              ? 'bg-cetus-accent/20 text-cetus-accent' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🔍 Search
        </button>
        {isConnected && (
          <button
            onClick={() => setActiveTab('my-pools')}
            className={`flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'my-pools' 
                ? 'bg-cetus-accent/20 text-cetus-accent' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            👤 My Pools {userPools.length > 0 && `(${userPools.length})`}
          </button>
        )}
      </div>

      {/* Search Input - only show in search tab */}
      {activeTab === 'search' && (
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search pools (e.g., SUI, USDC, ETH...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2.5 sm:py-3 pl-10 text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:border-cetus-accent"
              autoFocus
            />
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cetus-accent"></div>
          <span className="mt-3 text-gray-400 text-sm">Loading pools from Cetus...</span>
          {loadingProgress && (
            <span className="text-xs text-gray-500 mt-1">{loadingProgress}</span>
          )}
        </div>
      )}

      {/* Popular Pools Tab */}
      {!loading && activeTab === 'popular' && (
        <div className="space-y-2">
          {popularPools.length > 0 ? (
            popularPools.map((pool) => (
              <PoolCard key={pool.poolId} pool={pool} />
            ))
          ) : (
            <div className="text-center py-6 text-gray-400 text-sm">
              Loading popular pools...
            </div>
          )}
          <p className="text-xs text-gray-500 text-center mt-3">
            Use the Search tab to find more pools
          </p>
        </div>
      )}

      {/* Search Results Tab */}
      {!loading && activeTab === 'search' && (
        <>
          <div className="space-y-2 max-h-[350px] sm:max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {displayedPools.map((pool) => (
              <PoolCard key={pool.poolId} pool={pool} />
            ))}
          </div>

          {/* Show More Button */}
          {filteredPools.length > 10 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full mt-3 py-2 text-center text-cetus-accent hover:text-cetus-primary text-sm"
            >
              Show all {filteredPools.length} pools ↓
            </button>
          )}

          {showAll && filteredPools.length > 10 && (
            <button
              onClick={() => setShowAll(false)}
              className="w-full mt-3 py-2 text-center text-gray-400 hover:text-white text-sm"
            >
              Show less ↑
            </button>
          )}

          {filteredPools.length === 0 && searchQuery && (
            <div className="text-center py-6 text-gray-400 text-sm">
              No pools found matching "{searchQuery}"
            </div>
          )}
        </>
      )}

      {/* My Pools Tab */}
      {!loading && activeTab === 'my-pools' && isConnected && (
        <div className="space-y-2">
          {loadingUserPools ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cetus-accent"></div>
              <span className="mt-2 text-gray-400 text-sm">Loading your pools...</span>
            </div>
          ) : userPools.length > 0 ? (
            userPools.map((pool) => (
              <PoolCard key={pool.poolId} pool={pool} isUserPool />
            ))
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-gray-400 text-sm">No liquidity positions found</p>
              <a
                href="https://app.cetus.zone/pools"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-cetus-accent hover:text-cetus-primary text-sm"
              >
                Add liquidity on Cetus →
              </a>
            </div>
          )}
        </div>
      )}

      {/* Selected Pool Summary */}
      {selectedPool && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-[10px] sm:text-xs text-gray-500 mb-1">Selected Pool</p>
          <div className="flex justify-between items-center">
            <span className="text-white font-medium text-sm sm:text-base">{selectedPool.formattedName}</span>
            <span className="text-cetus-accent text-sm">
              ${formatPrice(selectedPool.currentPrice)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoolSelector;
