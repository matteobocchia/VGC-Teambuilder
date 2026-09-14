const formats = [
  {
    id: 'champions-regulation-mb-doubles',
    game: 'pokemon-champions',
    name: 'Regulation M-B Doubles',
    battleMode: 'doubles',
    level: 50,
    statPoints: { perStatMax: 32, totalMax: 66 },
    officialRulesOnly: true,
    active: true,
  },
];

export async function GET() {
  return Response.json({ data: formats, meta: { apiVersion: 'v1' } });
}
