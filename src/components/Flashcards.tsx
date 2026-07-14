import React, { useState } from 'react';
import { Deck, Card } from '../types';
import { Plus, Trash, Check, HelpCircle, ArrowLeft, ArrowRight, BookOpen, Layers } from 'lucide-react';
import { saveDeck, removeDeck } from '../storageUtils';

interface FlashcardsProps {
  decks: Deck[];
  onDecksUpdated: (decks: Deck[]) => void;
  subjects: string[];
}

export const Flashcards: React.FC<FlashcardsProps> = ({ decks, onDecksUpdated }) => {
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAddDeck, setShowAddDeck] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);

  // Form states
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;

    const newDeck: Deck = {
      id: crypto.randomUUID(),
      name: newDeckName.trim(),
      description: newDeckDesc.trim(),
      cards: [],
      createdAt: new Date().toISOString(),
    };

    await saveDeck(newDeck);
    onDecksUpdated([...decks, newDeck]);
    setNewDeckName('');
    setNewDeckDesc('');
    setShowAddDeck(false);
    setSelectedDeck(newDeck);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  const handleDeleteDeck = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this deck?')) {
      await removeDeck(id);
      onDecksUpdated(decks.filter((d) => d.id !== id));
      if (selectedDeck?.id === id) {
        setSelectedDeck(null);
      }
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeck || !cardFront.trim() || !cardBack.trim()) return;

    const newCard: Card = {
      id: crypto.randomUUID(),
      front: cardFront.trim(),
      back: cardBack.trim(),
      mastered: false,
    };

    const updatedDeck = {
      ...selectedDeck,
      cards: [...selectedDeck.cards, newCard],
    };

    await saveDeck(updatedDeck);
    onDecksUpdated(decks.map((d) => (d.id === selectedDeck.id ? updatedDeck : d)));
    setSelectedDeck(updatedDeck);

    setCardFront('');
    setCardBack('');
    setShowAddCard(false);
  };

  const handleToggleMastered = async (cardId: string) => {
    if (!selectedDeck) return;

    const updatedCards = selectedDeck.cards.map((c) =>
      c.id === cardId ? { ...c, mastered: !c.mastered } : c
    );

    const updatedDeck = { ...selectedDeck, cards: updatedCards };
    await saveDeck(updatedDeck);
    onDecksUpdated(decks.map((d) => (d.id === selectedDeck.id ? updatedDeck : d)));
    setSelectedDeck(updatedDeck);
  };

  const handleNext = () => {
    if (!selectedDeck) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev + 1) % selectedDeck.cards.length);
    }, 150);
  };

  const handlePrev = () => {
    if (!selectedDeck) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentCardIndex((prev) => (prev - 1 + selectedDeck.cards.length) % selectedDeck.cards.length);
    }, 150);
  };

  return (
    <div className="space-y-6">
      {selectedDeck === null ? (
        /* Decks View */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Layers size={20} className="text-indigo-600" /> Flashcard Decks
            </h2>
            <button
              id="btn-show-add-deck"
              onClick={() => setShowAddDeck(!showAddDeck)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors"
            >
              Create Deck
            </button>
          </div>

          {showAddDeck && (
            <form onSubmit={handleCreateDeck} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-base">Create Flashcard Deck</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Deck Name</label>
                  <input
                    id="deck-name"
                    type="text"
                    placeholder="e.g. Biology Midterm, React Fundamentals"
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Description</label>
                  <input
                    id="deck-desc"
                    type="text"
                    placeholder="Briefly describe what this deck covers..."
                    value={newDeckDesc}
                    onChange={(e) => setNewDeckDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  id="btn-cancel-add-deck"
                  type="button"
                  onClick={() => setShowAddDeck(false)}
                  className="text-slate-500 hover:text-slate-900 px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-add-deck"
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {decks.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-100 rounded-2xl p-12 text-center shadow-sm">
                <HelpCircle size={40} className="text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-600">No decks available</p>
                <p className="text-xs text-slate-400 mt-1">Create a flashcard deck to start self-testing!</p>
              </div>
            ) : (
              decks.map((deck) => (
                <div
                  key={deck.id}
                  id={`deck-card-${deck.id}`}
                  onClick={() => {
                    setSelectedDeck(deck);
                    setCurrentCardIndex(0);
                    setIsFlipped(false);
                  }}
                  className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:border-slate-200 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-base">
                      {deck.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                      {deck.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-6">
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <BookOpen size={12} /> {deck.cards.length} cards
                    </span>
                    <button
                      id={`btn-deck-delete-${deck.id}`}
                      onClick={(e) => handleDeleteDeck(deck.id, e)}
                      className="text-slate-400 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete Deck"
                    >
                      <Trash size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Active Deck Practice View */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              id="btn-back-to-decks"
              onClick={() => setSelectedDeck(null)}
              className="text-slate-600 hover:text-slate-900 font-semibold text-xs flex items-center gap-1"
            >
              <ArrowLeft size={16} /> Back to Decks
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">
                {selectedDeck.name} ({selectedDeck.cards.length} cards)
              </span>
              <button
                id="btn-show-add-card"
                onClick={() => setShowAddCard(!showAddCard)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-colors"
              >
                Add Card
              </button>
            </div>
          </div>

          {showAddCard && (
            <form onSubmit={handleCreateCard} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-base">Add New Flashcard</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Front (Question / Prompt)</label>
                  <input
                    id="card-front"
                    type="text"
                    placeholder="e.g. Mitochondria"
                    value={cardFront}
                    onChange={(e) => setCardFront(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Back (Answer / Explanation)</label>
                  <input
                    id="card-back"
                    type="text"
                    placeholder="e.g. Powerhouse of the cell"
                    value={cardBack}
                    onChange={(e) => setCardBack(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  id="btn-cancel-add-card"
                  type="button"
                  onClick={() => setShowAddCard(false)}
                  className="text-slate-500 hover:text-slate-900 px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-add-card"
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-colors"
                >
                  Add Card
                </button>
              </div>
            </form>
          )}

          {selectedDeck.cards.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center shadow-sm">
              <HelpCircle size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">No cards in this deck</p>
              <p className="text-xs text-slate-400 mt-1">Click &quot;Add Card&quot; to build your deck!</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* Card Container */}
              <div
                id="flashcard-box"
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full max-w-lg min-h-[280px] bg-white border border-slate-100 rounded-3xl p-8 shadow-sm flex flex-col justify-between items-center text-center cursor-pointer hover:border-slate-200 transition-all relative select-none"
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest absolute top-6 left-6">
                  Card {currentCardIndex + 1} of {selectedDeck.cards.length}
                </span>

                <div className="my-auto px-4 py-6">
                  {isFlipped ? (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">Answer</span>
                      <p className="text-xl font-bold text-slate-900">{selectedDeck.cards[currentCardIndex].back}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">Prompt</span>
                      <p className="text-xl font-bold text-slate-900">{selectedDeck.cards[currentCardIndex].front}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between w-full border-t border-slate-50 pt-4">
                  <button
                    id="btn-toggle-mastered"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMastered(selectedDeck.cards[currentCardIndex].id);
                    }}
                    className={`text-xs font-semibold px-4 py-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
                      selectedDeck.cards[currentCardIndex].mastered
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    <Check size={14} />
                    {selectedDeck.cards[currentCardIndex].mastered ? 'Mastered!' : 'Mark as Mastered'}
                  </button>
                  <span className="text-xs text-slate-400 font-medium">Click to flip</span>
                </div>
              </div>

              {/* Navigation controls */}
              <div className="flex items-center justify-center gap-4 mt-6">
                <button
                  id="btn-prev-card"
                  onClick={handlePrev}
                  className="p-3 bg-white border border-slate-100 rounded-full text-slate-600 hover:text-slate-900 shadow-sm transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <button
                  id="btn-next-card"
                  onClick={handleNext}
                  className="p-3 bg-white border border-slate-100 rounded-full text-slate-600 hover:text-slate-900 shadow-sm transition-colors"
                >
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
