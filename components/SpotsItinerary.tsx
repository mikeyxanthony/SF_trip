'use client';

import { useMemo, useState } from 'react';
import { MapPin, Navigation, ShieldCheck, Sparkles, TriangleAlert, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useTrip, getTagColor } from '@/components/providers/TripProvider';
import { formatDateDayMonth, formatTag, normalizePlaceTag, truncate } from '@/lib/helpers';
import { getSafeExternalHref } from '@/lib/security';

function SpotsItinerarySkeleton() {
  const titleWidths = ['w-3/5', 'w-2/3', 'w-1/2', 'w-3/4'];
  const descWidths = ['w-[85%]', 'w-[70%]', 'w-[78%]', 'w-[65%]'];
  return (
    <div className="flex min-h-0 flex-col overflow-y-auto p-3 scrollbar-thin max-sm:max-h-[38vh]">
      <div className="mb-2.5 flex items-start justify-between gap-2">
        <div>
          <div className="h-[18px] w-32 animate-pulse rounded-sm bg-border/40" />
          <div className="mt-1.5 flex gap-1.5">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-[28px] w-[60px] animate-pulse rounded-sm bg-border/30" style={{ animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        </div>
        <div className="h-5 w-[60px] animate-pulse rounded-sm bg-border/25" style={{ animationDelay: '100ms' }} />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="rounded-none border border-border bg-bg-elevated p-3.5" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <div className={`h-[15px] ${titleWidths[i]} animate-pulse rounded-sm bg-border/50`} style={{ animationDelay: `${i * 100}ms` }} />
              <div className="h-5 w-[52px] animate-pulse rounded-sm bg-border/25 shrink-0" style={{ animationDelay: `${i * 100 + 50}ms` }} />
            </div>
            <div className="mb-1.5 h-[12px] w-[60%] animate-pulse rounded-sm bg-border/30" style={{ animationDelay: `${i * 100 + 100}ms` }} />
            <div className={`mb-2.5 h-[12px] ${descWidths[i]} animate-pulse rounded-sm bg-border/30`} style={{ animationDelay: `${i * 100 + 150}ms` }} />
            <div className="h-[28px] w-[80px] animate-pulse rounded-sm bg-border/25" style={{ animationDelay: `${i * 100 + 200}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function haversineMiles(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function formatMiles(miles) {
  if (!Number.isFinite(miles)) return '';
  if (miles < 0.1) return '< 0.1 mi';
  if (miles < 1) return `${miles.toFixed(1)} mi`;
  return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
}

export default function SpotsItinerary() {
  const {
    allPlaces,
    visiblePlaces,
    placeTagFilter,
    setPlaceTagFilter,
    placeTagOptions,
    addPlaceToDayPlan,
    handleDeleteCustomSpot,
    deletingCustomSpotId,
    selectedDate,
    isInitializing,
  } = useTrip();
  const [selectedPlaceId, setSelectedPlaceId] = useState('');

  const selectedPlace = useMemo(() => {
    return visiblePlaces.find((place) => place.id === selectedPlaceId) || null;
  }, [selectedPlaceId, visiblePlaces]);

  const safeMapLink = getSafeExternalHref(selectedPlace?.mapLink);
  const safeCornerLink = getSafeExternalHref(selectedPlace?.cornerLink);

  const nearbyGuidePlaces = useMemo(() => {
    if (!selectedPlace) return [];
    const originLat = Number(selectedPlace.lat);
    const originLng = Number(selectedPlace.lng);
    if (!Number.isFinite(originLat) || !Number.isFinite(originLng)) return [];

    return allPlaces
      .filter((candidate) => candidate.id !== selectedPlace.id)
      .map((candidate) => {
        const lat = Number(candidate.lat);
        const lng = Number(candidate.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const miles = haversineMiles(originLat, originLng, lat, lng);
        return { ...candidate, miles };
      })
      .filter(Boolean)
      .sort((left, right) => left.miles - right.miles)
      .slice(0, 4)
      .filter((candidate) => candidate.miles <= 12);
  }, [allPlaces, selectedPlace]);

  const customNearbyThings = Array.isArray(selectedPlace?.nearbyThings)
    ? selectedPlace.nearbyThings
    : [];

  if (isInitializing) {
    return <SpotsItinerarySkeleton />;
  }

  return (
    <div className="flex min-h-0 flex-col overflow-y-auto p-3 scrollbar-thin max-sm:max-h-[38vh]">
      <div className="mb-2.5 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="m-0 text-base font-bold tracking-tight">Curated Spots {selectedDate ? `· ${formatDateDayMonth(selectedDate)}` : ''}</h2>
          <div className="mt-1 flex items-center gap-1.5">
            <ToggleGroup
              className="flex flex-nowrap gap-1.5 overflow-x-auto scrollbar-none"
              type="single"
              value={placeTagFilter}
              onValueChange={(v) => { if (v) setPlaceTagFilter(v); }}
            >
              {placeTagOptions.map((tag) => (
                <ToggleGroupItem key={tag} className="shrink-0 px-3 py-1" value={tag}>
                  {formatTag(tag)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
        <span className="inline-flex items-center whitespace-nowrap rounded-none bg-bg-subtle px-2 py-0.5 text-[0.7rem] font-semibold text-muted max-sm:w-fit">
          {visiblePlaces.length} places
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {visiblePlaces.length === 0 ? (
          <p className="my-3 rounded-none border border-dashed border-border bg-bg-subtle p-7 text-center text-sm text-muted">
            No curated places in this category.
          </p>
        ) : (
          visiblePlaces.map((place) => (
            (() => {
              const placeKey = place.id || `${place.name}-${place.location}`;
              const safeCardMapLink = getSafeExternalHref(place.mapLink);
              const safeCardCornerLink = getSafeExternalHref(place.cornerLink);
              const safeFriendUrl = getSafeExternalHref(place.recommendations?.find((recommendation) => recommendation?.friendUrl)?.friendUrl);
              const cardTag = normalizePlaceTag(place.tag);
              return (
                <Card
                  key={placeKey}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open details for ${place.name}`}
                  className="cursor-pointer p-3.5 transition hover:border-accent-border hover:shadow-[0_0_0_3px_var(--color-accent-glow)] focus:outline-none focus:ring-2 focus:ring-accent/40"
                  onClick={() => setSelectedPlaceId(placeKey)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedPlaceId(placeKey);
                    }
                  }}
                >
                  <div className="flex gap-2 justify-between items-start">
                    <h3 className="m-0 mb-1.5 text-[0.92rem] font-semibold leading-snug">{place.name}</h3>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {place.isRecommended ? (
                        <Badge className="uppercase tracking-wider" variant="default">Recommended</Badge>
                      ) : null}
                      <Badge
                        className="uppercase tracking-wider"
                        variant="secondary"
                        style={{ backgroundColor: `${getTagColor(place.tag)}22`, color: getTagColor(place.tag) }}
                      >
                        {formatTag(place.tag)}
                      </Badge>
                    </div>
                  </div>
                  <p className="my-0.5 text-[0.82rem] leading-relaxed text-foreground-secondary"><strong>Location:</strong> {place.location}</p>
                  {Array.isArray(place.recommendedBy) && place.recommendedBy.length > 0 ? (
                    <p className="my-0.5 text-[0.82rem] leading-relaxed text-foreground-secondary"><strong>Recommended by:</strong> {place.recommendedBy.join(', ')}</p>
                  ) : null}
                  {safeFriendUrl ? (
                    <p className="my-0.5 text-[0.82rem] leading-relaxed text-foreground-secondary">
                      <strong>Credit:</strong>{' '}
                      <a
                        className="text-accent no-underline hover:underline"
                        href={safeFriendUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                      >
                        View profile
                      </a>
                    </p>
                  ) : null}
                  {Array.isArray(place.recommendations) && place.recommendations[0]?.note ? (
                    <p className="my-0.5 text-[0.82rem] leading-relaxed text-foreground-secondary"><strong>Friend note:</strong> {place.recommendations[0].note}</p>
                  ) : null}
                  {place.curatorComment ? <p className="my-0.5 text-[0.82rem] leading-relaxed text-foreground-secondary"><strong>Curator note:</strong> {place.curatorComment}</p> : null}
                  {place.description ? <p className="my-0.5 text-[0.82rem] leading-relaxed text-foreground-secondary">{truncate(place.description, 180)}</p> : null}
                  {place.details ? <p className="my-0.5 text-[0.82rem] leading-relaxed text-foreground-secondary">{truncate(place.details, 220)}</p> : null}
                  {cardTag === 'avoid' ? (
                    <div className="my-1.5 flex flex-col gap-1">
                      <p className="my-0 flex items-center gap-1.5 text-[0.82rem] font-semibold text-[#CC3333]">
                        <TriangleAlert className="h-4 w-4 shrink-0" />
                        {place.risk === 'extreme' ? 'DO NOT VISIT' : place.risk === 'high' ? 'High risk — stay away' : 'Exercise caution'}
                      </p>
                      {place.crimeTypes ? <p className="my-0 pl-[22px] text-[0.78rem] font-medium text-[#CC3333]">{place.crimeTypes}</p> : null}
                    </div>
                  ) : cardTag === 'safe' ? (
                    <div className="my-1.5 flex flex-col gap-1">
                      <p className="my-0 flex items-center gap-1.5 text-[0.82rem] font-semibold text-accent">
                        <ShieldCheck className="h-4 w-4 shrink-0" />
                        Safer area
                      </p>
                      <p className="my-0 pl-[22px] text-[0.78rem] font-medium text-accent">{place.safetyLabel || place.safetyHighlights || 'Lower violent-crime profile than city average.'}</p>
                      {place.crimeTypes ? <p className="my-0 pl-[22px] text-[0.76rem] text-accent/80">Watch for: {place.crimeTypes}</p> : null}
                    </div>
                  ) : (
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={(event) => { event.stopPropagation(); addPlaceToDayPlan(place); }}>
                        Add to day
                      </Button>
                      {place.sourceType === 'custom_spot' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          disabled={deletingCustomSpotId === place.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeleteCustomSpot(place.id);
                          }}
                        >
                          {deletingCustomSpotId === place.id ? 'Deleting...' : 'Delete Spot'}
                        </Button>
                      ) : null}
                    </div>
                  )}
                  {(safeCardMapLink || safeCardCornerLink) ? (
                    <p className="my-0.5 flex flex-wrap gap-3 text-[0.82rem] leading-relaxed text-foreground-secondary">
                      {safeCardMapLink ? (
                        <a
                          className="mt-1.5 inline-flex items-center gap-0.5 font-semibold text-[0.82rem] text-accent no-underline hover:text-accent-hover hover:underline hover:underline-offset-2"
                          href={safeCardMapLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          Open map
                        </a>
                      ) : null}
                      {safeCardCornerLink ? (
                        <a
                          className="mt-1.5 inline-flex items-center gap-0.5 font-semibold text-[0.82rem] text-accent no-underline hover:text-accent-hover hover:underline hover:underline-offset-2"
                          href={safeCardCornerLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          Corner page
                        </a>
                      ) : null}
                    </p>
                  ) : null}
                  <div className="mt-2 inline-flex items-center gap-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted">
                    <Sparkles className="h-3.5 w-3.5" />
                    Tap for details
                  </div>
                </Card>
              );
            })()
          ))
        )}
      </div>

      {selectedPlace ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 sm:items-center"
          onClick={() => setSelectedPlaceId('')}
        >
          <Card
            className="relative w-full max-w-4xl overflow-hidden border border-border bg-bg-elevated shadow-[0_20px_70px_rgba(0,0,0,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-bg-elevated/95 px-4 py-3 backdrop-blur">
                <div>
                  <p className="m-0 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-muted">Spot details</p>
                  <h3 className="m-0 mt-1 text-xl font-bold tracking-tight sm:text-2xl">{selectedPlace.name}</h3>
                </div>
                <Button type="button" size="sm" variant="secondary" className="h-9 w-9 p-0" onClick={() => setSelectedPlaceId('')} aria-label="Close details">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="border-b border-border px-4 py-4 lg:border-b-0 lg:border-r">
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      className="uppercase tracking-wider"
                      variant="secondary"
                      style={{ backgroundColor: `${getTagColor(selectedPlace.tag)}22`, color: getTagColor(selectedPlace.tag) }}
                    >
                      {formatTag(selectedPlace.tag)}
                    </Badge>
                    {selectedPlace.isRecommended ? <Badge className="uppercase tracking-wider">Recommended</Badge> : null}
                    {selectedPlace.sourceType === 'custom_spot' ? <Badge className="uppercase tracking-wider">Custom spot</Badge> : null}
                  </div>

                  <p className="mt-3 text-sm leading-6 text-foreground-secondary">
                    <strong>Location:</strong> {selectedPlace.location}
                  </p>
                  {selectedPlace.curatorComment ? (
                    <p className="mt-2 text-sm leading-6 text-foreground-secondary">
                      <strong>Curator note:</strong> {selectedPlace.curatorComment}
                    </p>
                  ) : null}
                  {selectedPlace.description ? (
                    <p className="mt-3 text-sm leading-7 text-foreground-secondary">
                      {selectedPlace.description}
                    </p>
                  ) : null}
                  {selectedPlace.details ? (
                    <p className="mt-3 text-sm leading-7 text-foreground-secondary">
                      {selectedPlace.details}
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {safeMapLink ? (
                      <Button type="button" size="sm" variant="secondary" asChild>
                        <a href={safeMapLink} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                          <MapPin className="h-4 w-4" />
                          Open in Google Maps
                        </a>
                      </Button>
                    ) : null}
                    {safeCornerLink ? (
                      <Button type="button" size="sm" variant="secondary" asChild>
                        <a href={safeCornerLink} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                          <Navigation className="h-4 w-4" />
                          Corner page
                        </a>
                      </Button>
                    ) : null}
                    {cardTag !== 'avoid' && cardTag !== 'safe' ? (
                      <Button type="button" size="sm" onClick={() => { addPlaceToDayPlan(selectedPlace); setSelectedPlaceId(''); }}>
                        Add to day
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-0 border-t border-border lg:border-t-0">
                  <div className="border-b border-border px-4 py-4">
                    <h4 className="m-0 text-sm font-semibold uppercase tracking-[0.14em] text-muted">Nearby things to do</h4>
                    {customNearbyThings.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {customNearbyThings.map((idea) => {
                          const safeIdeaLink = getSafeExternalHref(idea.mapLink);
                          return (
                            <div key={idea.name} className="rounded-2xl border border-border bg-white/70 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="m-0 text-sm font-semibold text-foreground">{idea.name}</p>
                                  {idea.note ? <p className="m-0 mt-1 text-sm leading-6 text-foreground-secondary">{idea.note}</p> : null}
                                </div>
                                {safeIdeaLink ? (
                                  <Button type="button" size="sm" variant="secondary" className="shrink-0" asChild>
                                    <a href={safeIdeaLink} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                                      Map
                                    </a>
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-foreground-secondary">
                        Nearby guide picks appear below based on the rest of the trip guide.
                      </p>
                    )}
                  </div>

                  <div className="px-4 py-4">
                    <h4 className="m-0 text-sm font-semibold uppercase tracking-[0.14em] text-muted">Nearby guide picks</h4>
                    {nearbyGuidePlaces.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {nearbyGuidePlaces.map((place) => {
                          const placeLink = getSafeExternalHref(place.mapLink);
                          return (
                            <div key={`${place.id}-${place.name}`} className="rounded-2xl border border-border bg-white/70 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="m-0 text-sm font-semibold text-foreground">{place.name}</p>
                                  <p className="m-0 mt-1 text-xs uppercase tracking-[0.12em] text-muted">
                                    {formatTag(place.tag)} · {formatMiles(place.miles)} away
                                  </p>
                                  {place.description ? <p className="m-0 mt-1 text-sm leading-6 text-foreground-secondary">{truncate(place.description, 120)}</p> : null}
                                </div>
                                {placeLink ? (
                                  <Button type="button" size="sm" variant="secondary" className="shrink-0" asChild>
                                    <a href={placeLink} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                                      Map
                                    </a>
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-foreground-secondary">
                        No other guide spots are close enough to surface here.
                      </p>
                    )}
                  </div>

                  {selectedPlace.crimeTypes && cardTag === 'avoid' ? (
                    <div className="border-t border-border px-4 py-4">
                      <p className="m-0 flex items-center gap-2 text-sm font-semibold text-[#CC3333]">
                        <TriangleAlert className="h-4 w-4" />
                        {selectedPlace.risk === 'extreme' ? 'DO NOT VISIT' : selectedPlace.risk === 'high' ? 'High risk — stay away' : 'Exercise caution'}
                      </p>
                      <p className="m-0 mt-2 text-sm leading-6 text-[#CC3333]">{selectedPlace.crimeTypes}</p>
                    </div>
                  ) : null}

                  {selectedPlace.safetyLabel || selectedPlace.safetyHighlights || selectedPlace.crimeTypes ? (
                    cardTag === 'safe' ? (
                      <div className="border-t border-border px-4 py-4">
                        <p className="m-0 flex items-center gap-2 text-sm font-semibold text-accent">
                          <ShieldCheck className="h-4 w-4" />
                          Safer area
                        </p>
                        {selectedPlace.safetyLabel || selectedPlace.safetyHighlights ? (
                          <p className="m-0 mt-2 text-sm leading-6 text-accent">{selectedPlace.safetyLabel || selectedPlace.safetyHighlights}</p>
                        ) : null}
                        {selectedPlace.crimeTypes ? <p className="m-0 mt-2 text-sm leading-6 text-accent/80">Watch for: {selectedPlace.crimeTypes}</p> : null}
                      </div>
                    ) : null
                  ) : null}
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
