'use client';

import Link from 'next/link';

interface MatchCardProps {
  id: string;
  image: string;
  name: string;
  age?: number;
  gender?: string;
  confidence: number;
  location?: string;
}

export function MatchCard({ id, image, name, age, confidence, location }: MatchCardProps) {
  return (
    <Link href={`/cases/${id}`}>
      <div className="bg-card rounded-xl overflow-hidden border border-border hover:border-primary hover:shadow-lg transition-all duration-300 cursor-pointer h-full">
        
        <div className="relative w-full h-48 bg-secondary overflow-hidden">
          <img
            src={image || '/placeholder.svg'}
            alt={name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 hover:opacity-40 transition-opacity" />
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-foreground text-lg truncate">{name}</h3>
          <p className="text-muted-foreground text-sm">{age != null ? `${age} years old` : 'Age unknown'}</p>

          {location && (
            <p className="text-muted-foreground text-sm mt-2">{location}</p>
          )}

          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground">Match Confidence</span>
              <span className="text-sm font-bold text-accent">{confidence}%</span>
            </div>

            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-gradient-to-r from-accent to-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${confidence}%` }}
              />
            </div>
          </div>

          <div className="w-full bg-primary text-white py-2 rounded-lg mt-3 text-center">
            View Details
          </div>
        </div>
      </div>
    </Link>
  );
}