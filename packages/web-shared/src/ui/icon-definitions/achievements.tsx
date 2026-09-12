import type { ReactNode } from 'react';

// Flat enamel-like artwork: one 48-unit grid, two-unit ink, and the foundation palette.
const ink = 'var(--ink, #252134)';
const violet = 'var(--purple, #6558e8)';
const mint = 'var(--mint, #13b88e)';
const yellow = 'var(--yellow, #ffd447)';
const coral = 'var(--coral, #ff637a)';
const paper = '#fff';

function artwork(content: ReactNode) {
	return { viewBox: '0 0 48 48', strokeWidth: 2, content: <g stroke={ink}>{content}</g> };
}

function Prism({ x, y, size = 9, color = violet }: { x: number; y: number; size?: number; color?: string }) {
	return (
		<g transform={`translate(${x} ${y})`}>
			<path d={`M0 ${-size} ${size} 0 0 ${size} ${-size} 0Z`} fill={color} />
			<path d={`M0 ${-size}V${size}L${-size} 0Z`} fill={paper} fillOpacity="0.55" stroke="none" />
			<path d={`M${-size} 0H${size}`} fill="none" strokeOpacity="0.45" />
		</g>
	);
}

const tierColors = [mint, mint, violet, coral, coral];
function routeAchievement(flawless: boolean, rank: number) {
	const color = tierColors[rank - 1];
	return artwork(
		<>
			{/* Two ribbon tails and a shared rank rail make this a single badge family. */}
			<path d="M10 28 6 43l10-4 8 5 8-5 10 4-4-15Z" fill={flawless ? yellow : color} />
			{flawless ? (
				<>
					<path d="M7 6 24 3l17 3v14c0 9-9 15-17 19C16 35 7 29 7 20Z" fill={paper} />
					<path d="m12 10 12-2 12 2v10c0 6-6 11-12 14-6-3-12-8-12-14Z" fill={color} />
					<Prism x={24} y={20} size={7} color={yellow} />
				</>
			) : (
				<>
					<path d="M7 5h34v25L24 39 7 30Z" fill={paper} />
					<path d="M12 9h24v18l-12 6-12-6Z" fill={color} />
					<path d="M19 29V13h12l-3 5 3 5H19" fill={yellow} />
				</>
			)}
			<path d="M10 36h28v8H10Z" fill={ink} />
			{Array.from({ length: 5 }, (_, index) => (
				<path
					key={index}
					d={`M${13 + index * 5} 38h2v4h-2Z`}
					stroke="none"
					fill={index < rank ? yellow : '#696477'}
				/>
			))}
		</>,
	);
}

export const achievementIcons = {
	achievementTraining: artwork(
		<>
			<path d="M7 5h27l7 7v29H7Z" fill={paper} />
			<path d="M7 5h9v36H7Z" fill={violet} />
			<path d="M34 5v7h7" fill={yellow} />
			<path d="M21 13h7M21 19h13" />
			<path d="m29 23 10 6v11l-10 5-10-5V29Z" fill={mint} />
			<path d="m24 34 4 4 7-9" stroke={paper} strokeWidth="3" />
		</>,
	),
	achievementInjection: artwork(
		<>
			<path d="M6 27 20 19l14 8v11l-14 8-14-8Z" fill={violet} />
			<path d="m6 27 14 8 14-8M20 35v11" />
			<path d="m6 27 14-8 14 8-14 8Z" fill={paper} />
			<Prism x={20} y={20} size={9} color={mint} />
			<path d="M35 4v12m-6-6h12" stroke={mint} strokeWidth="4" />
			<path d="M8 8v7M4.5 11.5h7M36 24v5" stroke={violet} />
		</>,
	),
	achievementArray: artwork(
		<>
			<path d="M13 27v11h22V23" stroke={violet} strokeWidth="3" />
			<path d="m4 25 9-5 9 5v5l-9 5-9-5Z" fill={violet} />
			<path d="m26 15 9-5 9 5v5l-9 5-9-5Z" fill={mint} />
			<Prism x={13} y={19} size={9} />
			<Prism x={35} y={9} size={7} color={mint} />
			<path d="M22 35h6v6h-6Z" fill={yellow} />
			<path d="M8 5h6M11 2v6" stroke={mint} />
		</>,
	),
	achievementReorder: artwork(
		<>
			<path d="M8 13V7h29m-5-5 5 5-5 5M40 35v6H11m5-5-5 5 5 5" stroke={violet} />
			<path d="M4 17h16v16H4Z" fill={mint} />
			<path d="M28 17h16v16H28Z" fill={yellow} />
			<path d="m8 25 4-4 4 4-4 4Z" fill={paper} />
			<path d="M33 22h6v6h-6Z" fill={coral} />
			<path d="M21 25h6" />
		</>,
	),
	achievementWrap: artwork(
		<>
			<path d="M11 4H4v40h7M37 4h7v40h-7" stroke={violet} strokeWidth="3" />
			<path d="M11 10h26v28H11Z" fill={violet} />
			<path d="M11 10h26v7H11Z" fill={yellow} />
			<path d="M16 17v16h16V17" fill={paper} />
			<Prism x={24} y={25} size={5} color={mint} />
			<path d="M20 42h8" stroke={violet} />
		</>,
	),
	achievementTargeting: artwork(
		<>
			<circle cx="24" cy="24" r="17" fill={paper} />
			<path d="M24 7a17 17 0 0 1 17 17H24Z" fill={coral} />
			<circle cx="24" cy="24" r="10" fill={paper} />
			<path d="M24 2v10m0 24v10M2 24h10m24 0h10" />
			<Prism x={24} y={24} size={5} color={coral} />
			<path d="m35 8 5-5M8 35l-5 5" stroke={coral} />
		</>,
	),
	achievementCalibration: artwork(
		<>
			<path d="m8 30 16-8 16 8v8l-16 8-16-8Z" fill={violet} />
			<path d="m8 30 16 8 16-8M24 38v8" />
			<Prism x={24} y={24} size={12} color={violet} />
			<path d="m12 12 12-8 12 8" stroke={yellow} strokeWidth="4" />
			<path d="M4 20v8M44 20v8" stroke={mint} />
			<path d="M15 41v-3m6 6v-3m6 3v-3m6 0v-3" stroke={paper} />
		</>,
	),
	achievementTrail: artwork(
		<>
			<path d="M5 37h13l13-13" stroke={mint} strokeWidth="7" />
			<path d="M6 26h11l8-8M15 44h11l9-9" stroke={violet} strokeWidth="2" />
			<Prism x={33} y={15} size={11} color={mint} />
			<path d="M5 15h5v5H5ZM34 36h5v5h-5Z" fill={yellow} />
			<path d="M18 7h6" stroke={mint} />
		</>,
	),
	achievementClearRelaxed: routeAchievement(false, 1),
	achievementClearEasy: routeAchievement(false, 2),
	achievementClearNormal: routeAchievement(false, 3),
	achievementClearHard: routeAchievement(false, 4),
	achievementClearExtreme: routeAchievement(false, 5),
	achievementFlawlessRelaxed: routeAchievement(true, 1),
	achievementFlawlessEasy: routeAchievement(true, 2),
	achievementFlawlessNormal: routeAchievement(true, 3),
	achievementFlawlessHard: routeAchievement(true, 4),
	achievementFlawlessExtreme: routeAchievement(true, 5),
	achievementSpectrum: artwork(
		<>
			<path d="M24 6 42 24 24 42 6 24Z" stroke={violet} />
			<circle cx="24" cy="8" r="6" fill={mint} />
			<path d="m39 17 7 12H32Z" fill={coral} />
			<path d="M18 35h12v11H18Z" fill={yellow} />
			<path d="m8 17 7 7-7 7-7-7Z" fill={violet} />
			<Prism x={24} y={24} size={6} color={paper} />
		</>,
	),
	achievementPurifier: artwork(
		<>
			<path d="M5 8h12l7 9 7-9h12L30 25v10H18V25Z" fill={mint} />
			<path d="M18 30h12v6H18Z" fill={paper} />
			<path d="m24 36 6 5-6 5-6-5Z" fill={yellow} />
			<path d="M5 19h5v5H5ZM37 27h5v5h-5Z" fill={coral} />
			<path d="m24 2 4 5-4 5-4-5Z" fill={violet} />
			<path d="M5 35h7M8.5 31.5v7M36 40h6" stroke={mint} />
		</>,
	),
	achievementSolo: artwork(
		<>
			<path d="M5 18 24 4l19 14v21H5Z" fill={paper} />
			<path d="M5 30h38v9H5Z" fill={mint} />
			<path d="M16 33h16v11H16Z" fill={violet} />
			<Prism x={24} y={22} size={11} color={violet} />
			<path d="M24 37v4" stroke={yellow} strokeWidth="3" />
			<path d="M6 10h6M9 7v6M37 7v5" stroke={mint} />
		</>,
	),
	achievementLevelOne: artwork(
		<>
			<path d="M4 35h40v8H4Z" fill={mint} />
			<path d="M8 26h10v9H8ZM30 26h10v9H30Z" fill={paper} />
			<Prism x={13} y={22} size={8} color={mint} />
			<Prism x={35} y={22} size={8} color={mint} />
			<path d="M17 3h14v11H17Z" fill={yellow} />
			<path d="M24 6v5" strokeWidth="3" />
			<path d="M13 39h22" stroke={paper} />
		</>,
	),
	achievementLegend: artwork(
		<>
			<path d="m6 6 10 7 8-10 8 10 10-7-4 17H10Z" fill={yellow} />
			<Prism x={24} y={16} size={4} color={violet} />
			<path d="M4 28h40v14H4Z" fill={violet} />
			{[8, 15, 22, 29, 36].map((x) => (
				<path key={x} d={`M${x} 31h4v8h-4Z`} fill={yellow} stroke="none" />
			))}
			<path d="M12 24h24" />
		</>,
	),
	achievementLanguage: artwork(
		<>
			<path d="M12 12h24v24H12Z" stroke={violet} />
			<path d="M4 4h14v14H4Z" fill={yellow} />
			<path d="m37 3 8 15H29Z" fill={coral} />
			<path d="M4 30h14v14H4Z" fill={mint} />
			<path d="M8 33v8m6-8v8" stroke={paper} />
			<path d="M30 30h14v14H30Z" fill={violet} />
			<path d="m33 39 4-5 4 5" stroke={paper} />
			<Prism x={24} y={24} size={7} color={paper} />
		</>,
	),
};
