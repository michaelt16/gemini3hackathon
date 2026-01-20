'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

// Mock photos for each album
const mockPhotos = {
  '1': [
    { id: '1', url: null, caption: 'Family at the beach', date: '2024-07-15' },
    { id: '2', url: null, caption: 'Sunset dinner', date: '2024-07-15' },
    { id: '3', url: null, caption: 'Group photo', date: '2024-07-16' },
    { id: '4', url: null, caption: 'Morning walk', date: '2024-07-16' },
    { id: '5', url: null, caption: 'Beach games', date: '2024-07-17' },
    { id: '6', url: null, caption: 'Farewell moment', date: '2024-07-17' },
  ],
  '2': [
    { id: '1', url: null, caption: 'Birthday cake', date: '2024-03-22' },
    { id: '2', url: null, caption: 'Family gathering', date: '2024-03-22' },
    { id: '3', url: null, caption: 'Blowing candles', date: '2024-03-22' },
    { id: '4', url: null, caption: 'Group hug', date: '2024-03-22' },
  ],
  '3': [
    { id: '1', url: null, caption: 'Christmas tree', date: '2023-12-25' },
    { id: '2', url: null, caption: 'Opening presents', date: '2023-12-25' },
    { id: '3', url: null, caption: 'Family dinner', date: '2023-12-25' },
    { id: '4', url: null, caption: 'Kids playing', date: '2023-12-25' },
    { id: '5', url: null, caption: 'Evening gathering', date: '2023-12-25' },
  ],
};

const albumInfo = {
  '1': { title: 'Summer 2024 Reunion', date: '2024-07-15', location: 'Lake Tahoe, CA' },
  '2': { title: 'Grandma\'s 80th Birthday', date: '2024-03-22', location: 'Chicago, IL' },
  '3': { title: 'Christmas 2023', date: '2023-12-25', location: 'Home' },
};

export default function Album6DetailPage() {
  const params = useParams();
  const albumId = params.id as string;
  const photos = mockPhotos[albumId as keyof typeof mockPhotos] || [];
  const info = albumInfo[albumId as keyof typeof albumInfo];
  const [currentPage, setCurrentPage] = useState(0);
  
  // Show 2 photos per page (left and right page spread)
  const photosPerPage = 2;
  const totalPages = Math.ceil(photos.length / photosPerPage);

  if (!info) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-amber-900 mb-4">Album not found</h1>
          <Link href="/album6" className="text-amber-700 hover:underline">← Back to albums</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Back Button */}
        <div className="mb-8">
          <Link 
            href="/album6"
            className="inline-flex items-center gap-2 text-amber-800 hover:text-amber-900 font-serif mb-4 transition-colors"
          >
            <span>←</span>
            <span>Back to Albums</span>
          </Link>
          <div className="text-center">
            <h1 className="text-4xl font-serif font-bold text-amber-900 mb-2">{info.title}</h1>
            <p className="text-amber-700 font-serif">
              {new Date(info.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} • {info.location}
            </p>
          </div>
        </div>

        {/* Opened Book View */}
        <div className="relative max-w-6xl mx-auto">
          {/* Book Binding/Center Crease */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-800 via-amber-700 to-amber-600 transform -translate-x-1/2 z-30 shadow-lg" />
          
          {/* Book Pages Container */}
          <div className="relative bg-amber-50 rounded-2xl shadow-2xl overflow-hidden border-4 border-amber-300">
            {/* Paper Texture Background */}
            <div 
              className="relative min-h-[600px] p-8 md:p-12"
              style={{
                backgroundImage: `
                  repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 2px,
                    rgba(139, 69, 19, 0.03) 2px,
                    rgba(139, 69, 19, 0.03) 4px
                  ),
                  repeating-linear-gradient(
                    90deg,
                    transparent,
                    transparent 2px,
                    rgba(139, 69, 19, 0.03) 2px,
                    rgba(139, 69, 19, 0.03) 4px
                  )
                `,
                backgroundColor: '#fef9e7',
              }}
            >
              {/* Two-Page Spread */}
              <div className="grid grid-cols-2 gap-4 md:gap-8">
                {/* Left Page */}
                <div className="relative">
                  {/* Page Shadow/Depth */}
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-200/20 to-transparent rounded-l-lg" />
                  
                  {/* Page Content */}
                  <div className="relative space-y-6">
                    {photos.slice(currentPage * photosPerPage, currentPage * photosPerPage + 1).map((photo, idx) => (
                      <div key={photo.id} className="relative">
                        {/* Photo with Vintage Frame */}
                        <div className="relative bg-white p-3 shadow-lg rounded-sm">
                          {/* Vintage Corner Clips */}
                          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-amber-600/40 z-10" />
                          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-amber-600/40 z-10" />
                          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-amber-600/40 z-10" />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-amber-600/40 z-10" />
                          
                          {/* Photo Placeholder */}
                          <div className="aspect-[3/4] bg-gradient-to-br from-amber-200 via-orange-200 to-yellow-200 relative overflow-hidden rounded-sm">
                            {photo.url ? (
                              <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-5xl opacity-30">📷</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Caption */}
                          <div className="mt-3 text-center">
                            <p className="text-sm font-serif text-amber-900 italic">{photo.caption}</p>
                            <p className="text-xs text-amber-600 font-serif mt-1">{photo.date}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Empty space if only one photo on left page */}
                    {photos.slice(currentPage * photosPerPage, currentPage * photosPerPage + 1).length === 1 && (
                      <div className="h-32" />
                    )}
                  </div>
                </div>

                {/* Right Page */}
                <div className="relative">
                  {/* Page Shadow/Depth */}
                  <div className="absolute inset-0 bg-gradient-to-l from-amber-200/20 to-transparent rounded-r-lg" />
                  
                  {/* Page Content */}
                  <div className="relative space-y-6">
                    {photos.slice(currentPage * photosPerPage + 1, currentPage * photosPerPage + 2).map((photo) => (
                      <div key={photo.id} className="relative">
                        {/* Photo with Vintage Frame */}
                        <div className="relative bg-white p-3 shadow-lg rounded-sm">
                          {/* Vintage Corner Clips */}
                          <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-amber-600/40 z-10" />
                          <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-amber-600/40 z-10" />
                          <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-amber-600/40 z-10" />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-amber-600/40 z-10" />
                          
                          {/* Photo Placeholder */}
                          <div className="aspect-[3/4] bg-gradient-to-br from-amber-200 via-orange-200 to-yellow-200 relative overflow-hidden rounded-sm">
                            {photo.url ? (
                              <img src={photo.url} alt={photo.caption} className="w-full h-full object-cover" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-5xl opacity-30">📷</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Caption */}
                          <div className="mt-3 text-center">
                            <p className="text-sm font-serif text-amber-900 italic">{photo.caption}</p>
                            <p className="text-xs text-amber-600 font-serif mt-1">{photo.date}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Empty space if no photo on right page */}
                    {photos.slice(currentPage * photosPerPage + 1, currentPage * photosPerPage + 2).length === 0 && (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center opacity-30">
                          <span className="text-4xl block mb-2">📄</span>
                          <p className="text-sm font-serif text-amber-700">Empty page</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Page Numbers */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-between px-8 text-xs text-amber-600 font-serif">
                <span>Page {currentPage + 1}</span>
                <span>{totalPages} pages</span>
              </div>
            </div>
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-6 py-3 bg-amber-700 text-white rounded-lg hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-serif shadow-lg"
            >
              ← Previous Page
            </button>
            
            <div className="flex gap-2">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    currentPage === idx 
                      ? 'bg-amber-700 w-8' 
                      : 'bg-amber-300 hover:bg-amber-400'
                  }`}
                />
              ))}
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              className="px-6 py-3 bg-amber-700 text-white rounded-lg hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-serif shadow-lg"
            >
              Next Page →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
