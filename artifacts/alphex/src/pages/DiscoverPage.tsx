import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SearchBox } from '../components/SearchBox';
import { CategorySlider } from '../components/CategorySlider';
import { GameCard } from '../components/GameCard';
import { GAMES, GameCategory, smartMatch } from '../lib/gameData';

export interface Suggestion {
  id: string;
  title: string;
  subtitle: string;
}

export default function DiscoverPage() {
  const [searchQuery,    setSearchQuery]    = useState('');
  const [activeCategory, setActiveCategory] = useState<GameCategory>('All Games');

  const filteredGames = useMemo(() => {
    return GAMES.filter(game => {
      const matchesSearch   = smartMatch(game, searchQuery);
      const matchesCategory = activeCategory === 'All Games' || game.categories.includes(activeCategory);
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  /** Autocomplete suggestions: games that have a searchSubtitle AND match the
   *  current query via smartMatch. Only shown when the query is non-empty. */
  const suggestions = useMemo<Suggestion[]>(() => {
    if (!searchQuery.trim()) return [];
    return GAMES
      .filter(g => g.searchSubtitle && smartMatch(g, searchQuery))
      .map(g => ({ id: g.id, title: g.title, subtitle: g.searchSubtitle! }));
  }, [searchQuery]);

  const handleSuggestionSelect = (title: string) => {
    setSearchQuery(title);
  };

  return (
    <div className="min-h-[100dvh] pt-24 pb-16 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4 uppercase tracking-wider text-shadow-neon-cyan">
            Discover &amp; Play
          </h1>
          <div className="h-1 w-24 mx-auto bg-gradient-to-r from-transparent via-primary to-transparent rounded-full opacity-50" />
        </motion.div>

        {/* Search & Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12 space-y-8"
        >
          <SearchBox
            value={searchQuery}
            onChange={setSearchQuery}
            suggestions={suggestions}
            onSuggestionSelect={handleSuggestionSelect}
          />
          <CategorySlider activeCategory={activeCategory} onSelect={setActiveCategory} />
        </motion.div>

        {/* Grid Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {filteredGames.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredGames.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + index * 0.05, duration: 0.3 }}
                >
                  <GameCard game={game} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center glassmorphism rounded-xl border border-border/50">
              <div className="text-muted-foreground font-mono text-lg mb-2">No matching records found.</div>
              <div className="text-primary/70 font-display text-sm uppercase tracking-widest">Adjust parameters and retry</div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
