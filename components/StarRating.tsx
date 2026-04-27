'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

interface StarRatingProps {
  rating?: number        // promedio actual
  totalVotos?: number
  onRate?: (valor: number) => void  // si es undefined = solo lectura
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
}

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7'
}

export default function StarRating({
  rating = 0,
  totalVotos = 0,
  onRate,
  size = 'md',
  showCount = true
}: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null)
  const [seleccionado, setSeleccionado] = useState<number | null>(null)

  const esInteractivo = !!onRate
  const valorMostrado = hover ?? seleccionado ?? rating

  const handleClick = (valor: number) => {
    if (!esInteractivo) return
    setSeleccionado(valor)
    onRate(valor)
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((estrella) => {
          const llena = estrella <= valorMostrado
          return (
            <button
              key={estrella}
              type="button"
              disabled={!esInteractivo}
              onClick={() => handleClick(estrella)}
              onMouseEnter={() => esInteractivo && setHover(estrella)}
              onMouseLeave={() => esInteractivo && setHover(null)}
              className={`transition-transform ${
                esInteractivo
                  ? 'cursor-pointer hover:scale-110'
                  : 'cursor-default'
              }`}
            >
              <Star
                className={`${sizes[size]} transition-colors ${
                  llena
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-transparent text-gray-300'
                }`}
              />
            </button>
          )
        })}
      </div>

      {showCount && (
        <span className="text-sm text-gray-500">
          {rating > 0 ? (
            <>
              <span className="font-medium text-gray-700">{rating.toFixed(1)}</span>
              {' '}({totalVotos} {totalVotos === 1 ? 'calificación' : 'calificaciones'})
            </>
          ) : (
            'Sin calificaciones'
          )}
        </span>
      )}
    </div>
  )
}