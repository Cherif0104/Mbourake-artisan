import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wrench, Zap, Hammer, PaintBucket, Car, Scissors, Heart, CheckCircle, Star, Search, Droplets, 
  CloudLightning, Wind, ChefHat, Lightbulb, Truck, HardHat, Sparkles, Bike, Cpu, Smartphone, 
  UtensilsCrossed, Leaf, Waves, Home, Fan, Recycle, Gem, Palette, Briefcase, LayoutGrid, Grid,
  Square, Anvil, ThermometerSnowflake, ArrowUpDown, Flame, Layers, Shield, PanelTop, Info,
  CircleDot, User, Package, Armchair, Footprints, UserRound, Flower2, Brush, Flower, ShoppingBasket,
  Watch, PenTool, CakeSlice, Utensils, Wheat, Fish, Coffee, Beaker, Bird, CupSoda, Shrub, IceCream,
  Monitor, Wifi, Printer, Video, HardDrive, Code, MessageSquare, Camera, Music, Tv, ShieldAlert,
  GraduationCap, BookOpen, FileText, BarChart3, Languages, Eye, Bell, ShoppingCart, Sun, Umbrella, 
  Layout, ArrowUpRight, Bomb, Volume2, Beef, Tablet, Gamepad2, Code2, Boxes, Plane, LogOut
} from 'lucide-react';
import { useDiscovery } from '../hooks/useDiscovery';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { categories: dbCategories, loading } = useDiscovery();
  const [searchQuery, setSearchQuery] = useState('');
  
  const isLoggedIn = !!user && !!profile;
  
  // Map icon names to Lucide components
  const iconMap: Record<string, React.ReactNode> = {
    'hammer': <Hammer size={24} />,
    'wrench': <Wrench size={24} />,
    'paint-bucket': <PaintBucket size={24} />,
    'droplets': <Droplets size={24} />,
    'zap': <Zap size={24} />,
    'hard-hat': <HardHat size={24} />,
    'cloud-lightning': <CloudLightning size={24} />,
    'wind': <Wind size={24} />,
    'car': <Car size={24} />,
    'scissors': <Scissors size={24} />,
    'chef-hat': <ChefHat size={24} />,
    'truck': <Truck size={24} />,
    'lightbulb': <Lightbulb size={24} />,
    'sparkles': <Sparkles size={24} />,
    'bike': <Bike size={24} />,
    'cpu': <Cpu size={24} />,
    'smartphone': <Smartphone size={24} />,
    'utensils-crossed': <UtensilsCrossed size={24} />,
    'leaf': <Leaf size={24} />,
    'waves': <Waves size={24} />,
    'home': <Home size={24} />,
    'fan': <Fan size={24} />,
    'recycle': <Recycle size={24} />,
    'gem': <Gem size={24} />,
    'palette': <Palette size={24} />,
    'briefcase': <Briefcase size={24} />,
    'layout-grid': <LayoutGrid size={24} />,
    'grid': <Grid size={24} />,
    'sun': <Sun size={24} />,
    'umbrella': <Umbrella size={24} />,
    'layout': <Layout size={24} />,
    'square': <Square size={24} />,
    'anvil': <Anvil size={24} />,
    'thermometer-snowflake': <ThermometerSnowflake size={24} />,
    'arrow-up-down': <ArrowUpDown size={24} />,
    'flame': <Flame size={24} />,
    'layers': <Layers size={24} />,
    'shield': <Shield size={24} />,
    'panel-top': <PanelTop size={24} />,
    'info': <Info size={24} />,
    'circle-dot': <CircleDot size={24} />,
    'user': <User size={24} />,
    'package': <Package size={24} />,
    'armchair': <Armchair size={24} />,
    'footprints': <Footprints size={24} />,
    'user-round': <UserRound size={24} />,
    'flower2': <Flower2 size={24} />,
    'brush': <Brush size={24} />,
    'flower': <Flower size={24} />,
    'shopping-basket': <ShoppingBasket size={24} />,
    'watch': <Watch size={24} />,
    'pen-tool': <PenTool size={24} />,
    'cake-slice': <CakeSlice size={24} />,
    'utensils': <Utensils size={24} />,
    'wheat': <Wheat size={24} />,
    'fish': <Fish size={24} />,
    'coffee': <Coffee size={24} />,
    'beaker': <Beaker size={24} />,
    'bird': <Bird size={24} />,
    'cup-soda': <CupSoda size={24} />,
    'shrub': <Shrub size={24} />,
    'ice-cream': <IceCream size={24} />,
    'monitor': <Monitor size={24} />,
    'wifi': <Wifi size={24} />,
    'printer': <Printer size={24} />,
    'video': <Video size={24} />,
    'hard-drive': <HardDrive size={24} />,
    'code': <Code size={24} />,
    'message-square': <MessageSquare size={24} />,
    'camera': <Camera size={24} />,
    'music': <Music size={24} />,
    'tv': <Tv size={24} />,
    'shield-alert': <ShieldAlert size={24} />,
    'graduation-cap': <GraduationCap size={24} />,
    'book-open': <BookOpen size={24} />,
    'file-text': <FileText size={24} />,
    'bar-chart-3': <BarChart3 size={24} />,
    'languages': <Languages size={24} />,
    'eye': <Eye size={24} />,
    'bell': <Bell size={24} />,
    'shopping-cart': <ShoppingCart size={24} />,
    'bomb': <Bomb size={24} />,
    'volume-2': <Volume2 size={24} />,
    'beef': <Beef size={24} />,
    'tablet': <Tablet size={24} />,
    'gamepad-2': <Gamepad2 size={24} />,
    'code-2': <Code2 size={24} />,
    'boxes': <Boxes size={24} />,
    'plane': <Plane size={24} />,
  };

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return dbCategories;
    return dbCategories.filter(cat => 
      cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [dbCategories, searchQuery]);

  const topArtisans = [
    { name: 'Fatou Diop', role: 'Électricité', rating: 4.9, reviews: 35, status: 'Disponible', type: 'Platine', img: 'https://images.unsplash.com/photo-1531123897727-8f129e16fd3c?auto=format&fit=crop&q=80' },
    { name: 'Moussa Sene', role: 'Plomberie', rating: 4.8, reviews: 24, status: 'Disponible', type: 'Or', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80' },
    { name: 'Awa Cissé', role: 'Peinture', rating: 4.6, reviews: 15, status: 'Disponible', type: 'Bronze', img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80' },
    { name: 'Ibrahima Gueye', role: 'Menuiserie', rating: 4.5, reviews: 18, status: 'Occupé', type: 'Argent', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const element = document.getElementById('categories-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] overflow-x-hidden selection:bg-brand-100 font-sans">
      {/* Top Navbar */}
      <nav className="bg-white px-6 md:px-20 py-4 flex items-center justify-between border-b shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-gray-800 tracking-tighter italic">Mboura <span className="text-brand-500">ké</span></span>
          <div className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center text-[10px] text-gray-400 font-bold">i</div>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <Heart className="hidden md:block text-gray-300 cursor-pointer hover:text-red-500 transition-colors" size={22} />
          
          {isLoggedIn ? (
            <>
              {/* Logged in user buttons */}
              <button 
                onClick={() => navigate('/dashboard')}
                className="bg-white text-gray-700 border-2 border-gray-200 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:border-brand-300 hover:text-brand-600 active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <User size={16} />
                Mon espace
              </button>
              {profile?.role === 'client' && (
                <button 
                  onClick={() => navigate('/create-project')}
                  className="bg-brand-500 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-100 hover:bg-brand-600 active:scale-[0.98] transition-all"
                >
                  + Nouveau projet
                </button>
              )}
            </>
          ) : (
            <>
              {/* Not logged in buttons */}
              <button 
                onClick={() => navigate('/login?mode=signup')}
                className="bg-white text-gray-700 border-2 border-gray-200 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:border-brand-300 hover:text-brand-600 active:scale-[0.98] transition-all"
              >
                Inscription
              </button>
              <button 
                onClick={() => navigate('/login?mode=login')}
                className="bg-brand-500 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-100 hover:bg-brand-600 active:scale-[0.98] transition-all"
              >
                Connexion
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section 
        className="relative h-[650px] flex flex-col items-center justify-center text-center px-6 overflow-hidden"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />
        <div className="relative z-10 w-full max-w-4xl animate-in fade-in zoom-in duration-700">
          <h1 className="text-4xl md:text-7xl font-black text-white mb-10 tracking-tighter leading-[1.1]">
            Trouvez les meilleurs <br />
            <span className="text-brand-500">artisans</span> du Sénégal.
          </h1>
          
          <form onSubmit={handleSearch} className="flex w-full max-w-2xl mx-auto bg-white rounded-2xl overflow-hidden shadow-2xl p-1.5 border-4 border-white/20 backdrop-blur-md transition-all focus-within:ring-4 ring-brand-500/30">
            <div className="flex-1 flex items-center px-4 gap-3 text-gray-400">
              <Search size={24} className="text-brand-500" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Quel artisan cherchez-vous ? (ex: Maçon, Tailleur...)"
                className="w-full py-4 outline-none text-gray-700 font-bold text-lg placeholder:font-medium"
              />
            </div>
            <button type="submit" className="bg-brand-500 text-white px-10 py-4 font-black rounded-xl hover:bg-brand-600 transition-all uppercase tracking-widest text-xs shadow-lg shadow-brand-100 active:scale-95">
              Rechercher
            </button>
          </form>
          
          <div className="mt-10 flex flex-wrap justify-center gap-3">
             {['Maçonnerie', 'Plomberie', 'Couture', 'Solaire', 'Mécanique'].map(tag => (
               <button key={tag} onClick={() => setSearchQuery(tag)} className="px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand-500 transition-all">
                 {tag}
               </button>
             ))}
          </div>
        </div>
      </section>

      {/* Categories Grid - Synchronized with DB */}
      <section id="categories-section" className="py-24 px-6 md:px-20 bg-white scroll-mt-24">
        <div className="flex flex-col items-center mb-20 text-center">
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">Tous nos corps de métiers</h2>
          <p className="text-gray-500 max-w-xl mb-8 font-medium leading-relaxed italic">"Le mélange parfait entre professionnels qualifiés et clients exigeants, ancré dans la culture sénégalaise."</p>
          <div className="h-1.5 w-24 bg-brand-500 rounded-full" />
        </div>
        
        {loading ? (
          <div className="flex justify-center p-20">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 max-w-7xl mx-auto">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat, i) => (
                <button 
                  key={cat.id} 
                  onClick={() => navigate(`/category/${cat.slug || cat.id}`)}
                  className="flex flex-col items-center group animate-in fade-in slide-in-from-bottom-4 duration-500" 
                  style={{ animationDelay: `${i * 5}ms` }}
                >
                  <div className="w-20 h-20 bg-orange-50/50 rounded-[2rem] flex items-center justify-center text-brand-500 mb-5 transition-all duration-500 group-hover:bg-brand-500 group-hover:text-white shadow-sm border border-orange-100 group-hover:rotate-6 group-hover:scale-110">
                    {iconMap[cat.icon_name || 'wrench'] || <Wrench size={24} />}
                  </div>
                  <span className="text-[9px] font-black text-gray-800 text-center uppercase tracking-[0.12em] leading-tight px-2 transition-colors group-hover:text-brand-600 h-10 flex items-center justify-center">
                    {cat.name}
                  </span>
                </button>
              ))
            ) : (
              <div className="col-span-full py-20 text-center">
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Aucun métier ne correspond à votre recherche "{searchQuery}"</p>
                <button onClick={() => setSearchQuery('')} className="mt-4 text-brand-500 font-black uppercase text-xs hover:underline underline-offset-4">Voir tous les métiers</button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Top Rated Artisans */}
      <section className="py-24 px-6 md:px-20 bg-[#FDFCFB]">
        <div className="flex flex-col items-center mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-4">Artisans les Mieux Notés</h2>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">La crème de l'artisanat national</p>
          <div className="h-1.5 w-20 bg-brand-500 rounded-full mt-4" />
        </div>
        
        {/* Filter Pills Preview */}
        <div className="flex flex-wrap justify-center gap-3 mb-12 max-w-3xl mx-auto">
          {['Tous', 'Platine', 'Or', 'Électricité', 'Plomberie', 'Couture'].map((filter, idx) => (
            <button 
              key={filter}
              onClick={() => navigate(idx === 0 ? '/artisans' : `/artisans?category=${filter}`)}
              className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                idx === 0 
                  ? 'bg-brand-500 text-white shadow-lg' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-300 hover:text-brand-600'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {topArtisans.map((pro, i) => (
            <div key={i} className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-500 group hover:-translate-y-2">
              <div className="relative h-60 overflow-hidden">
                <img src={pro.img} alt={pro.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className={`absolute top-5 left-5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg ${pro.status === 'Disponible' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {pro.status}
                </div>
                <div className="absolute top-5 right-5 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer hover:bg-brand-500 transition-all shadow-lg">
                  <Heart size={18} />
                </div>
              </div>
              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em]">{pro.role}</span>
                  <span className="bg-orange-100 text-brand-700 px-3 py-1 rounded-lg text-[9px] font-black uppercase">Expert {pro.type}</span>
                </div>
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-3">
                  {pro.name}
                  <CheckCircle size={18} className="text-green-500 fill-green-500/10" />
                </h3>
                <div className="flex items-center gap-4 text-gray-400 text-sm font-bold mb-8">
                  <div className="flex items-center gap-1.5">
                    <Star size={16} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-gray-900 font-black">{pro.rating}</span>
                    <span className="opacity-50 text-[10px]">({pro.reviews} avis)</span>
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/login?mode=login')}
                  className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-brand-500 active:scale-[0.98] transition-all uppercase tracking-widest text-[10px] shadow-lg"
                >
                  Voir le profil
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* CTA to see all artisans */}
        <div className="text-center mt-16">
          <button
            onClick={() => navigate('/artisans')}
            className="inline-flex items-center gap-3 px-10 py-5 bg-white border-2 border-gray-200 text-gray-900 font-black rounded-2xl hover:border-brand-500 hover:text-brand-600 transition-all uppercase tracking-widest text-xs shadow-lg hover:shadow-xl group"
          >
            Voir tous les artisans
            <ArrowUpRight size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Storytelling - Dark Premium */}
      <section className="py-32 px-6 md:px-20 bg-gray-900 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] -mr-48 -mt-48" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="w-20 h-20 bg-brand-500 rounded-[2.5rem] mx-auto mb-12 flex items-center justify-center rotate-12 shadow-2xl">
             <Heart size={36} fill="white" className="text-white -rotate-12" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-10 tracking-tight leading-tight italic">
            Mbouraké, c’est le <br />
            <span className="text-brand-500 not-italic">mélange parfait.</span>
          </h2>
          <p className="text-gray-400 text-lg md:text-xl font-medium leading-relaxed mb-16 italic opacity-80">
            "Inspiré du mot qui évoque l’association du pain ou du mil, avec du sucre et de la pâte d’arachide, Mbouraké symbolise l’alliance harmonieuse entre le Sénégal, les artisans qualifiés, et les clients à la recherche de produits satisfaisants et ancrés dans la culture."
          </p>
          <div className="flex flex-col items-center gap-8 opacity-40 grayscale">
             <div className="flex items-center gap-6">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Flag_of_Senegal.svg/1200px-Flag_of_Senegal.svg.png" alt="Sénégal" className="h-6 rounded-sm shadow-lg" />
                <span className="text-[10px] font-black tracking-[0.5em] uppercase text-white/80">CHAMBRES DE MÉTIERS DU SÉNÉGAL</span>
             </div>
          </div>
        </div>
      </section>

      {/* Professionals CTA Section */}
      <section className="py-32 px-6 bg-orange-50/20 flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-brand-500 rounded-3xl flex items-center justify-center text-white mb-10 rotate-6 shadow-2xl shadow-brand-100/50">
          <Hammer size={36} strokeWidth={2.5} className="-rotate-6" />
        </div>
        <h2 className="text-4xl font-black text-gray-900 mb-6 tracking-tight">Vous êtes un artisan ?</h2>
        <p className="text-gray-500 max-w-xl mb-12 leading-relaxed font-medium">
          Valorisez votre savoir-faire, gérez vos projets et sécurisez vos revenus avec la plateforme de référence au Sénégal.
        </p>
        <button 
          onClick={() => navigate('/login?mode=signup&role=artisan')}
          className="bg-gray-900 text-white px-16 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.25em] shadow-2xl hover:bg-brand-500 transition-all active:scale-95"
        >
          Rejoindre le réseau
        </button>
      </section>

      {/* Footer Minimalist */}
      <footer className="bg-white border-t py-20 px-6 text-center">
        <div className="mb-10">
          <span className="text-3xl font-black text-gray-900 tracking-tighter italic">Mboura <span className="text-brand-500">ké</span></span>
        </div>
        <p className="text-gray-400 text-[9px] font-black uppercase tracking-[0.4em] mb-10 opacity-60">© 2026 Mbourake - L'alliance de l'excellence artisanale.</p>
        <div className="h-px w-20 bg-orange-100 mx-auto" />
      </footer>
    </div>
  );
}
