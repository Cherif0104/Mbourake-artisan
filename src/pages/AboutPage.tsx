import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Heart, Target, Users, TrendingUp, Globe, 
  Award, Code, Lightbulb, Handshake, CheckCircle, Star,
  Mail, ExternalLink, MessageCircle, Building2, Brain, Zap,
  Database, Server, Smartphone, FileText, BarChart3, Briefcase,
  Network, Settings, Rocket, Home
} from 'lucide-react';

export function AboutPage() {
  const navigate = useNavigate();
  const [impulciaLogoError, setImpulciaLogoError] = React.useState(false);
  const [senegelLogoError, setSenegelLogoError] = React.useState(false);

  const handleWhatsApp = () => {
    window.open('https://wa.me/221788324069', '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-black text-gray-900">À propos</h1>
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-brand-50 rounded-xl transition-colors group"
            title="Retour à l'accueil"
          >
            <Home size={20} className="text-gray-600 group-hover:text-brand-500 transition-colors" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-12">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">
            Mboura<span className="text-brand-500">ké</span>
          </h2>
          <p className="text-xl text-gray-600 font-medium max-w-2xl mx-auto leading-relaxed">
            La plateforme qui connecte les meilleurs artisans du Sénégal avec des clients exigeants, 
            ancrée dans la culture sénégalaise et tournée vers l'excellence.
          </p>
        </section>

        {/* Mission & Vision */}
        <section className="mb-16">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-6">
                <Target size={28} className="text-brand-500" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4">Notre Mission</h3>
              <p className="text-gray-600 leading-relaxed">
                Faciliter la mise en relation entre artisans qualifiés et clients à la recherche 
                d'excellence. Nous créons un écosystème de confiance où chaque projet trouve 
                l'artisan parfait, et où chaque artisan peut développer son activité en toute sérénité.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
                <Lightbulb size={28} className="text-purple-500" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4">Notre Vision</h3>
              <p className="text-gray-600 leading-relaxed">
                Devenir la référence au Sénégal pour la mise en relation artisanale, en valorisant 
                le savoir-faire local et en promouvant l'excellence. Nous visons à transformer 
                le secteur artisanal sénégalais en le rendant plus accessible, transparent et performant.
              </p>
            </div>
          </div>
        </section>

        {/* Impact & Objectifs */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">Notre Impact</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Mbouraké transforme la façon dont les Sénégalais trouvent et travaillent avec des artisans.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-gradient-to-br from-brand-50 to-orange-50 rounded-2xl p-6 text-center border border-brand-100 shadow-sm">
              <Users size={32} className="text-brand-500 mx-auto mb-4" />
              <div className="text-3xl font-black text-gray-900 mb-2">500K</div>
              <p className="text-gray-600 font-medium text-sm">Jeunes artisans ciblés en 2026</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 text-center border border-green-100 shadow-sm">
              <TrendingUp size={32} className="text-green-500 mx-auto mb-4" />
              <div className="text-xl font-black text-gray-900 mb-2">Formation</div>
              <p className="text-gray-600 font-medium text-sm">Accompagnement & Digitalisation</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 text-center border border-blue-100 shadow-sm">
              <Handshake size={32} className="text-blue-500 mx-auto mb-4" />
              <div className="text-3xl font-black text-gray-900 mb-2">2026</div>
              <p className="text-gray-600 font-medium text-sm">Objectif annuel</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 text-center border border-purple-100 shadow-sm">
              <Star size={32} className="text-purple-500 mx-auto mb-4" />
              <div className="text-xl font-black text-gray-900 mb-2">Impact</div>
              <p className="text-gray-600 font-medium text-sm">Transformation du secteur</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <TrendingUp size={28} className="text-brand-500" />
              Nos Objectifs
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <CheckCircle size={24} className="text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-black text-gray-900 mb-2">Valoriser l'artisanat local</h4>
                  <p className="text-gray-600 text-sm">
                    Mettre en avant le savoir-faire sénégalais et créer des opportunités économiques 
                    pour les artisans locaux.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle size={24} className="text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-black text-gray-900 mb-2">Garantir la qualité</h4>
                  <p className="text-gray-600 text-sm">
                    Système de vérification et d'avis pour assurer la confiance entre clients et artisans.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle size={24} className="text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-black text-gray-900 mb-2">Faciliter l'accès</h4>
                  <p className="text-gray-600 text-sm">
                    Rendre les services artisanaux accessibles à tous, partout au Sénégal, 
                    avec une interface simple et intuitive.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CheckCircle size={24} className="text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-black text-gray-900 mb-2">Promouvoir l'excellence</h4>
                  <p className="text-gray-600 text-sm">
                    Système de niveaux et de badges pour récompenser les artisans les plus performants 
                    et encourager l'amélioration continue.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Équipe de Développement - IMPULCIA AFRIQUE (EN PREMIER) */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 rounded-full mb-6">
              <Code size={18} className="text-brand-500" />
              <span className="text-sm font-black text-brand-600 uppercase tracking-widest">Technologie</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
              L'innovation au service de l'excellence
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg leading-relaxed">
              Mbouraké est le fruit d'une collaboration entre vision et expertise technique, 
              portée par une équipe passionnée d'innovation made in Africa.
            </p>
          </div>

          <div className="bg-gradient-to-br from-brand-500 to-orange-600 rounded-3xl p-8 md:p-12 text-white shadow-2xl shadow-brand-200/50 mb-8">
            <div className="flex flex-col md:flex-row items-start gap-8 mb-8">
              {/* Logo IMPULCIA AFRIQUE */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center border-2 border-white/30 shadow-xl">
                  {!impulciaLogoError ? (
                    <img 
                      src="/logo-impulcia-afrique.jpg" 
                      alt="IMPULCIA AFRIQUE Logo" 
                      className="w-24 h-24 object-contain"
                      onError={() => setImpulciaLogoError(true)}
                    />
                  ) : (
                    <Code size={40} className="text-white" />
                  )}
                </div>
              </div>
              
              <div className="flex-1">
                <div className="mb-4">
                  <h3 className="text-3xl md:text-4xl font-black mb-2">IMPULCIA AFRIQUE</h3>
                  <p className="text-white/90 font-bold text-lg mb-4">
                    Ingénierie & Solution Informatique — Made in Africa
                  </p>
                </div>
                <p className="text-white/90 leading-relaxed mb-4 text-lg">
                  <strong>IMPULCIA AFRIQUE</strong> est un leader de l'innovation technologique en Afrique, 
                  reconnu pour son expertise exceptionnelle en ingénierie logicielle, intelligence artificielle 
                  et transformation digitale. Nous maîtrisons les technologies les plus avancées et repoussons 
                  constamment les limites de l'innovation pour créer des solutions qui transforment réellement 
                  les entreprises, les organisations et les gouvernements.
                </p>
                <p className="text-white/90 leading-relaxed mb-6 text-lg">
                  Notre approche unique combine <strong>excellence technique</strong>, <strong>maîtrise des nouvelles technologies</strong>, 
                  <strong> intelligence artificielle</strong> et <strong>vision stratégique</strong>. Nous ne nous contentons pas de développer 
                  des solutions : nous créons des écosystèmes digitaux complets qui permettent à nos clients de 
                  baser leur fonctionnement sur la <strong>performance</strong>, la <strong>traçabilité</strong>, 
                  l'<strong>automatisation</strong> et la <strong>culture de la data</strong> avec des objectifs 
                  mesurables, quantifiables et vérifiables.
                </p>
              </div>
            </div>

            {/* Services */}
            <div className="border-t border-white/30 pt-8 mb-8">
              <h4 className="text-xl font-black mb-6 flex items-center gap-2">
                <Rocket size={24} />
                Nos Services
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <Code size={20} className="text-white flex-shrink-0" />
                  <span className="text-sm font-bold">Ingénierie Informatique</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <Zap size={20} className="text-white flex-shrink-0" />
                  <span className="text-sm font-bold">Développement de Logiciels</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <Smartphone size={20} className="text-white flex-shrink-0" />
                  <span className="text-sm font-bold">Applications Mobiles</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <Globe size={20} className="text-white flex-shrink-0" />
                  <span className="text-sm font-bold">Sites Web Institutionnels</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <Briefcase size={20} className="text-white flex-shrink-0" />
                  <span className="text-sm font-bold">Applications Métiers</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <Users size={20} className="text-white flex-shrink-0" />
                  <span className="text-sm font-bold">SIRH</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <Network size={20} className="text-white flex-shrink-0" />
                  <span className="text-sm font-bold">Systèmes d'Information</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <Server size={20} className="text-white flex-shrink-0" />
                  <span className="text-sm font-bold">Hébergement & Plateformes</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <FileText size={20} className="text-white flex-shrink-0" />
                  <span className="text-sm font-bold">Formulaires de Collecte</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <BarChart3 size={20} className="text-white flex-shrink-0" />
                  <span className="text-sm font-bold">Data Analysis</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <TrendingUp size={20} className="text-white flex-shrink-0" />
                  <span className="text-sm font-bold">Solutions Performance</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <Brain size={20} className="text-white flex-shrink-0" />
                  <span className="text-sm font-bold">Conseil & Stratégie</span>
                </div>
              </div>
            </div>

            <div className="border-t border-white/30 pt-8">
              <h4 className="text-xl font-black mb-4 flex items-center gap-2">
                <Award size={24} />
                Expertise & Engagement
              </h4>
              <p className="text-white/90 leading-relaxed mb-4">
                Notre équipe combine une expertise technique de niveau mondial, une compréhension profonde des enjeux locaux 
                et une passion inébranlable pour l'innovation. Nous maîtrisons les technologies les plus récentes : 
                <strong> intelligence artificielle</strong>, <strong>machine learning</strong>, <strong>cloud computing</strong>, 
                <strong> architectures microservices</strong>, et bien plus encore.
              </p>
              <p className="text-white/90 leading-relaxed mb-6">
                Au-delà de l'ingénierie, nous offrons une <strong>expertise managériale</strong> en stratégie d'entreprise, 
                combinant <strong>conseil</strong>, <strong>accompagnement</strong> et <strong>exécution</strong>. 
                Nous développons des systèmes de notation de projet, des solutions de gestion de performance, 
                et accompagnons nos clients dans leur transformation digitale complète. Chaque ligne de code, 
                chaque architecture, chaque solution est conçue pour créer un impact réel et mesurable.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleWhatsApp}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 rounded-xl transition-all text-sm font-black shadow-lg"
                >
                  <MessageCircle size={18} />
                  WhatsApp
                  <ExternalLink size={14} />
                </button>
                <a 
                  href="mailto:impulcia-afrique@outlook.com" 
                  className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all text-sm font-black border border-white/30"
                >
                  <Mail size={18} />
                  Email
                </a>
                <a 
                  href="https://impulcia-afrique.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all text-sm font-black border border-white/30"
                >
                  <Globe size={18} />
                  Site Web
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Partenaire Initiateur - SENEGEL */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">Notre Partenaire</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Mbouraké est une initiative portée par une organisation engagée pour la transparence 
              et la bonne gouvernance au Sénégal.
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 md:p-12 border border-blue-100 shadow-sm">
            <div className="flex flex-col md:flex-row items-start gap-6">
              {/* Logo SENEGEL */}
              <div className="flex-shrink-0">
                <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center border-2 border-blue-200 shadow-lg">
                  {!senegelLogoError ? (
                    <img 
                      src="/logo-senegel.png" 
                      alt="SENEGEL Logo" 
                      className="w-20 h-20 object-contain"
                      onError={() => setSenegelLogoError(true)}
                    />
                  ) : (
                    <Building2 size={32} className="text-blue-500" />
                  )}
                </div>
              </div>
              
              <div className="flex-1">
                <h3 className="text-2xl font-black text-gray-900 mb-3">SENEGEL</h3>
                <p className="text-gray-700 font-bold mb-2">Senegalese Next Generation of Leaders</p>
                <p className="text-gray-600 leading-relaxed mb-6">
                  SENEGEL est une plateforme de données ouvertes qui permet à tous de suivre 
                  la législation, la diplomatie, l'économie et la culture sénégalaise. Engagée 
                  pour des pratiques éthiques et une bonne gouvernance, SENEGEL a initié le projet 
                  Mbouraké pour valoriser l'artisanat local et créer un écosystème de confiance 
                  entre artisans et clients.
                </p>
                <div className="flex flex-wrap gap-4">
                  <a 
                    href="https://www.senegel.org/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-blue-50 rounded-xl transition-all text-sm font-bold text-gray-700 border border-blue-200 shadow-sm"
                  >
                    <Globe size={18} />
                    Visiter SENEGEL
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Remerciements */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-brand-50 to-orange-50 rounded-2xl p-8 md:p-12">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Heart size={28} className="text-white" fill="currentColor" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">Remerciements</h2>
            </div>
            <div className="max-w-3xl mx-auto">
              <p className="text-gray-700 leading-relaxed text-center mb-6">
                Nous tenons à remercier tous ceux qui ont contribué à faire de Mbouraké une réalité :
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4 bg-white/50 rounded-xl p-4">
                  <Users size={24} className="text-brand-500 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-black text-gray-900 mb-1">Les Artisans</h4>
                    <p className="text-gray-600 text-sm">
                      Pour leur confiance et leur engagement à offrir des services de qualité.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 bg-white/50 rounded-xl p-4">
                  <Handshake size={24} className="text-brand-500 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-black text-gray-900 mb-1">Les Clients</h4>
                    <p className="text-gray-600 text-sm">
                      Pour leur confiance et leurs retours précieux qui nous permettent d'améliorer 
                      continuellement la plateforme.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 bg-white/50 rounded-xl p-4">
                  <Building2 size={24} className="text-brand-500 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-black text-gray-900 mb-1">SENEGEL</h4>
                    <p className="text-gray-600 text-sm">
                      Pour avoir initié ce projet et pour leur engagement en faveur de la transparence 
                      et de la bonne gouvernance au Sénégal.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 bg-white/50 rounded-xl p-4">
                  <Globe size={24} className="text-brand-500 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-black text-gray-900 mb-1">L'Écosystème Tech Sénégalais</h4>
                    <p className="text-gray-600 text-sm">
                      Pour l'inspiration et les échanges qui enrichissent notre vision de la tech 
                      made in Africa.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-gray-100">
            <h2 className="text-3xl font-black text-gray-900 mb-4">Rejoignez l'aventure</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Que vous soyez artisan ou client, Mbouraké est là pour vous accompagner dans 
              vos projets. Ensemble, construisons l'avenir de l'artisanat sénégalais.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/onboard?mode=signup')}
                className="px-8 py-4 bg-brand-500 text-white font-black rounded-xl hover:bg-brand-600 transition-all uppercase tracking-widest text-xs shadow-lg"
              >
                S'inscrire maintenant
              </button>
              <button
                onClick={() => navigate('/artisans')}
                className="px-8 py-4 bg-gray-100 text-gray-700 font-black rounded-xl hover:bg-gray-200 transition-all uppercase tracking-widest text-xs"
              >
                Découvrir les artisans
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16 py-8">
        <div className="max-w-5xl mx-auto px-4 md:px-6 text-center">
          <p className="text-gray-400 text-sm font-medium mb-2">
            © 2026 Mbouraké - L'alliance de l'excellence artisanale
          </p>
          <p className="text-gray-500 text-xs">
            Développé par{' '}
            <a 
              href="https://impulcia-afrique.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-black text-brand-500 hover:text-brand-600 transition-colors underline underline-offset-2"
            >
              IMPULCIA AFRIQUE
            </a>
            {' '}au Sénégal
          </p>
        </div>
      </footer>
    </div>
  );
}
