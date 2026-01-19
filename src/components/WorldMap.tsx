import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { motion, AnimatePresence } from 'framer-motion';
import type { WordJourney } from '@/types';

const getFlagEmoji = (countryCode: string): string => {
  if (!countryCode) return '';
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return '';
  return code
    .split('')
    .map(char => String.fromCodePoint(char.charCodeAt(0) + 127397))
    .join('');
};

interface WorldMapProps {
  journeyData: WordJourney | null;
  activeWaypointIndex: number;
  isPanelOpen: boolean;
}

export const WorldMap: React.FC<WorldMapProps> = ({
  journeyData,
  activeWaypointIndex,
  isPanelOpen
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomContainerRef = useRef<SVGGElement>(null);
  const baseMapRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => setDimensions({
      width: window.innerWidth,
      height: window.innerHeight
    });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { width, height } = dimensions;
  const sidePanelWidth = 400;
  const effectiveWidth = isPanelOpen ? width - sidePanelWidth : width;

  const projection = useMemo(() =>
    d3.geoNaturalEarth1()
      .scale(width / 5.5)
      .translate([width / 2, height / 2.2]),
    [width, height]
  );

  const pathGenerator = d3.geoPath().projection(projection);

  // Initialize Base Map Layer
  useEffect(() => {
    if (!svgRef.current || !zoomContainerRef.current || !baseMapRef.current) return;

    const svg = d3.select(svgRef.current);
    const zoomG = d3.select(zoomContainerRef.current);
    const baseG = d3.select(baseMapRef.current);

    baseG.selectAll('*').remove();

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 15])
      .on('zoom', (event) => {
        zoomG.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Graticule
    const graticule = d3.geoGraticule().step([15, 15]);
    baseG.append('path')
      .datum(graticule)
      .attr('d', pathGenerator as any)
      .attr('fill', 'none')
      .attr('stroke', '#000')
      .attr('stroke-width', 0.2)
      .attr('stroke-opacity', 0.2);

    // Load countries
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(res => res.json())
      .then(topology => {
        const countries = topojson.feature(topology, topology.objects.countries as any);
        baseG.selectAll('.country')
          .data((countries as any).features)
          .enter()
          .append('path')
          .attr('d', pathGenerator as any)
          .attr('fill', '#97C8B9')
          .attr('stroke', '#000')
          .attr('stroke-width', 0.3)
          .attr('opacity', 0.4);
      });
  }, [pathGenerator]);

  // Centering and Panning Logic
  useEffect(() => {
    if (!journeyData || !svgRef.current || !zoomRef.current) return;

    let targetCoords: [number, number];
    if (activeWaypointIndex === -1) {
      targetCoords = journeyData.origin.location.coordinates;
    } else if (journeyData.journey[activeWaypointIndex]) {
      targetCoords = journeyData.journey[activeWaypointIndex].location.coordinates;
    } else {
      return;
    }

    const projected = projection(targetCoords);
    if (!projected) return;

    const [tx, ty] = projected;
    const currentScale = 3.2;
    const centerX = effectiveWidth / 2;
    const centerY = height / 2;

    d3.select(svgRef.current).transition()
      .duration(1500)
      .ease(d3.easeCubicInOut)
      .call(
        zoomRef.current.transform,
        d3.zoomIdentity
          .translate(centerX, centerY)
          .scale(currentScale)
          .translate(-tx, -ty)
      );
  }, [journeyData, activeWaypointIndex, effectiveWidth, height, projection]);

  const renderJourneyLayer = () => {
    if (!journeyData) return null;

    const points: [number, number][] = [
      journeyData.origin.location.coordinates,
      ...journeyData.journey.map(j => j.location.coordinates)
    ];

    return (
      <g>
        <OriginMarker
          pos={projection(journeyData.origin.location.coordinates)}
          active={activeWaypointIndex >= -1}
          countryCode={journeyData.origin.location.countryCode}
          label={journeyData.origin.word}
          isOrigin={activeWaypointIndex === -1}
        />
        {journeyData.journey.map((step, idx) => {
          const isLand = step.routeType === 'land';
          const isActive = idx <= activeWaypointIndex;
          const isCurrent = idx === activeWaypointIndex;
          const pStart = projection(points[idx]);
          const pEnd = projection(points[idx + 1]);

          if (!pStart || !pEnd) return null;

          const dist = Math.sqrt(
            Math.pow(pEnd[0] - pStart[0], 2) + Math.pow(pEnd[1] - pStart[1], 2)
          );
          const midX = (pStart[0] + pEnd[0]) / 2;
          const midY = (pStart[1] + pEnd[1]) / 2 - dist * 0.4;
          const pathD = `M${pStart[0]},${pStart[1]} Q${midX},${midY} ${pEnd[0]},${pEnd[1]}`;

          return (
            <g key={`journey-layer-step-${idx}`}>
              <motion.path
                d={pathD}
                fill="none"
                stroke="black"
                strokeWidth={2}
                strokeDasharray={isLand ? "2 2" : "0"}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: isActive ? 1 : 0,
                  opacity: isActive ? 1 : 0
                }}
                transition={{ duration: 1.5, ease: "linear" }}
              />
              <WaypointMarker
                pos={pEnd}
                active={isActive}
                isCurrent={isCurrent}
                label={step.word}
                countryCode={step.location.countryCode}
              />
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <div className="w-full h-full bg-mint overflow-hidden">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="cursor-grab active:cursor-grabbing"
      >
        <g ref={zoomContainerRef}>
          <g ref={baseMapRef} />
          {renderJourneyLayer()}
        </g>
      </svg>
    </div>
  );
};

interface MarkerProps {
  pos: [number, number] | null;
  active: boolean;
  countryCode: string;
  label: string;
  isOrigin?: boolean;
  isCurrent?: boolean;
}

const OriginMarker: React.FC<MarkerProps> = ({ pos, active, countryCode, label, isOrigin }) => {
  if (!pos) return null;

  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: active ? 1 : 0, opacity: active ? 1 : 0 }}
    >
      <circle cx={pos[0]} cy={pos[1]} r={6} fill="white" stroke="black" strokeWidth={2} />
      <motion.g
        animate={{ opacity: [1, 0.2, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        <line x1={pos[0] - 4} y1={pos[1] - 4} x2={pos[0] + 4} y2={pos[1] + 4} stroke="black" strokeWidth={1.5} />
        <line x1={pos[0] + 4} y1={pos[1] - 4} x2={pos[0] - 4} y2={pos[1] + 4} stroke="black" strokeWidth={1.5} />
      </motion.g>
      <AnimatePresence>
        {isOrigin && (
          <motion.g
            initial={{ x: 10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <foreignObject x={pos[0] - 315} y={pos[1] - 10} width="300" height="20">
              <div className="flex justify-end items-center h-full">
                <div className="bg-black text-white px-2 py-0 text-[12px] font-bold font-mono uppercase whitespace-nowrap leading-tight h-[20px] flex items-center">
                  {getFlagEmoji(countryCode)} {label}
                </div>
              </div>
            </foreignObject>
          </motion.g>
        )}
      </AnimatePresence>
    </motion.g>
  );
};

const WaypointMarker: React.FC<MarkerProps> = ({ pos, active, isCurrent, label, countryCode }) => {
  if (!pos) return null;

  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: active ? 1 : 0, opacity: active ? 1 : 0 }}
    >
      {isCurrent ? (
        <g>
          <rect x={pos[0] - 4} y={pos[1] - 4} width={8} height={8} fill="black" />
          <line x1={pos[0] - 5} y1={pos[1] - 5} x2={pos[0] + 5} y2={pos[1] + 5} stroke="white" strokeWidth={1} />
          <line x1={pos[0] + 5} y1={pos[1] - 5} x2={pos[0] - 5} y2={pos[1] + 5} stroke="white" strokeWidth={1} />
        </g>
      ) : (
        <circle cx={pos[0]} cy={pos[1]} r={3.5} fill="black" />
      )}
      <AnimatePresence>
        {isCurrent && (
          <motion.g
            initial={{ x: 10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <foreignObject x={pos[0] - 315} y={pos[1] - 10} width="300" height="20">
              <div className="flex justify-end items-center h-full">
                <div className="bg-black text-white px-2 py-0 text-[12px] font-bold font-mono uppercase whitespace-nowrap leading-tight h-[20px] flex items-center">
                  {getFlagEmoji(countryCode)} {label}
                </div>
              </div>
            </foreignObject>
          </motion.g>
        )}
      </AnimatePresence>
    </motion.g>
  );
};
