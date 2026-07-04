import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Heart, Calendar, Share2, Bed, Bath, Car, Maximize, MapPin, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatPrice } from '@/lib/matchEngine';

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Property.get(id).then(p => {
      setProperty(p);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-latitud-orange/30 border-t-latitud-orange rounded-full animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-latitud-gray">Propiedad no encontrada</p>
      </div>
    );
  }

  const photos = property.photos || [];

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Photo gallery */}
      <div className="relative h-[50vh]">
        <img 
          src={photos[photoIndex] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'}
          alt={property.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <ArrowLeft size={20} className="text-white" />
          </button>
          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <Share2 size={18} className="text-white" />
            </button>
            <button className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <Heart size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* Photo navigation */}
        {photos.length > 1 && (
          <>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
              {photos.map((_, i) => (
                <button key={i} onClick={() => setPhotoIndex(i)} className={`h-1.5 rounded-full transition-all ${i === photoIndex ? 'w-6 bg-white' : 'w-3 bg-white/40'}`} />
              ))}
            </div>
            <button onClick={() => setPhotoIndex(i => Math.max(0, i - 1))} className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 bg-black/20 rounded-full backdrop-blur-sm">
              <ChevronLeft size={20} className="text-white" />
            </button>
            <button onClick={() => setPhotoIndex(i => Math.min(photos.length - 1, i + 1))} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-black/20 rounded-full backdrop-blur-sm">
              <ChevronRight size={20} className="text-white" />
            </button>
          </>
        )}

        {/* Operation badge */}
        <div className="absolute top-6 left-16 ml-2">
          <span className="bg-latitud-orange text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            {property.operation_type}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 -mt-6 relative z-10">
        <div className="bg-white rounded-t-3xl pt-6">
          {/* Price */}
          <p className="text-latitud-orange font-bold text-3xl mb-1">
            {formatPrice(property.price, property.currency)}
          </p>

          {/* Title */}
          <h1 className="font-heading text-2xl text-latitud-black leading-tight mb-2">
            {property.title}
          </h1>

          {/* Location */}
          <div className="flex items-center gap-1 text-latitud-gray text-sm mb-5">
            <MapPin size={14} />
            <span>{property.zone}, {property.city}</span>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {property.bedrooms > 0 && (
              <div className="bg-latitud-light rounded-xl p-3 text-center">
                <Bed size={18} className="text-latitud-orange mx-auto mb-1" />
                <p className="text-sm font-semibold text-latitud-black">{property.bedrooms}</p>
                <p className="text-[10px] text-latitud-gray">Recámaras</p>
              </div>
            )}
            {property.bathrooms > 0 && (
              <div className="bg-latitud-light rounded-xl p-3 text-center">
                <Bath size={18} className="text-latitud-orange mx-auto mb-1" />
                <p className="text-sm font-semibold text-latitud-black">{property.bathrooms}</p>
                <p className="text-[10px] text-latitud-gray">Baños</p>
              </div>
            )}
            {property.construction_area > 0 && (
              <div className="bg-latitud-light rounded-xl p-3 text-center">
                <Maximize size={18} className="text-latitud-orange mx-auto mb-1" />
                <p className="text-sm font-semibold text-latitud-black">{property.construction_area}</p>
                <p className="text-[10px] text-latitud-gray">m² const.</p>
              </div>
            )}
            {property.parking_spaces > 0 && (
              <div className="bg-latitud-light rounded-xl p-3 text-center">
                <Car size={18} className="text-latitud-orange mx-auto mb-1" />
                <p className="text-sm font-semibold text-latitud-black">{property.parking_spaces}</p>
                <p className="text-[10px] text-latitud-gray">Estac.</p>
              </div>
            )}
          </div>

          {/* Tags */}
          {property.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {property.tags.map(tag => (
                <span key={tag} className="text-xs bg-latitud-light text-latitud-gray px-3 py-1.5 rounded-full font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="mb-6">
            <h3 className="font-semibold text-latitud-black text-sm mb-2 uppercase tracking-wider">Descripción</h3>
            <p className="text-latitud-gray text-sm leading-relaxed">{property.description}</p>
          </div>

          {/* Amenities */}
          {property.amenities?.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-latitud-black text-sm mb-3 uppercase tracking-wider">Amenidades</h3>
              <div className="grid grid-cols-2 gap-2">
                {property.amenities.map(a => (
                  <div key={a} className="flex items-center gap-2 text-sm text-latitud-gray">
                    <div className="w-1.5 h-1.5 rounded-full bg-latitud-orange" />
                    {a}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Land area */}
          {property.land_area > 0 && (
            <div className="flex items-center justify-between py-3 border-t border-gray-100 mb-2">
              <span className="text-sm text-latitud-gray">Terreno</span>
              <span className="text-sm font-medium text-latitud-black">{property.land_area} m²</span>
            </div>
          )}
          {property.year_built > 0 && (
            <div className="flex items-center justify-between py-3 border-t border-gray-100 mb-2">
              <span className="text-sm text-latitud-gray">Año de construcción</span>
              <span className="text-sm font-medium text-latitud-black">{property.year_built}</span>
            </div>
          )}

          {/* Advisor */}
          <div className="mt-6 p-4 bg-latitud-light rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-latitud-orange/20 flex items-center justify-center">
              <span className="text-latitud-orange font-bold text-sm">{property.advisor_name?.[0]}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-latitud-black">{property.advisor_name}</p>
              <p className="text-xs text-latitud-gray">Consultor Latitud</p>
            </div>
            {property.advisor_phone && (
              <a href={`https://wa.me/${property.advisor_phone?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                <div className="w-10 h-10 rounded-full bg-latitud-orange flex items-center justify-center">
                  <Phone size={16} className="text-white" />
                </div>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3">
        <button className="flex-1 py-3 rounded-xl border-2 border-latitud-black text-latitud-black font-semibold text-sm">
          Contactar asesor
        </button>
        <button 
          onClick={() => navigate(-1)}
          className="flex-1 py-3 rounded-xl bg-latitud-orange text-white font-semibold text-sm"
        >
          Solicitar visita
        </button>
      </div>
    </div>
  );
}