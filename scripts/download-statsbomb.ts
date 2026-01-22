import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://raw.githubusercontent.com/statsbomb/open-data/master/data';
const DATA_DIR = path.join(__dirname, '..', 'data', 'statsbomb');

const colors = {
  'reset': '\x1b[0m',
  'red': '\x1b[31m',
  'green': '\x1b[32m',
  'yellow': '\x1b[33m',
  'blue': '\x1b[34m',
  'magenta': '\x1b[35m',
  'cyan': '\x1b[36m',
  'white': '\x1b[37m',
};


function log(message: string, color: keyof typeof colors) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download ${url}: ${response.statusText}`);
    }
    const data = await response.text();
    // Write the JSON directly - it's already valid JSON from the API
    fs.writeFileSync(outputPath, data, 'utf8');
    log(`Downloaded ${url} to ${outputPath}`, 'green');
  } catch (error) {
    throw new Error(`Failed to download ${url}: ${error.message}`);
  }
}

//create directory structure
function ensureDirectories() {
  const dirs = [
    DATA_DIR,
    path.join(DATA_DIR, 'events'),
    path.join(DATA_DIR, 'matches'),
    path.join(DATA_DIR, 'lineups')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`Created directory ${dir}`, 'green');
    }
  });

}

//download competitons
async function downloadCompetitions() {
  log('Downloading competitions...', 'blue');
  const url = `${BASE_URL}/competitions.json`;
  const outputPath = path.join(DATA_DIR, 'competitions.json');
  await downloadFile(url, outputPath);
  const competitions = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  log(`Downloaded competitions for match ${competitions.length}`, 'green');

  return competitions;
}

// download matches for a competition
async function downloadMatches(competitionId: number, seasonId: number) {
  const url = `${BASE_URL}/matches/${competitionId}/${seasonId}.json`;
  const outputPath = path.join(DATA_DIR, 'matches', `${competitionId}_${seasonId}.json`);
  // outpath could be ${competitionId}_${seasonId} or ${competitionId}-${seasonId}

  try {
    await downloadFile(url, outputPath);
    const matches = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    log(`Downloaded matches for competition ${competitionId} and season ${seasonId}`, 'green');
    return matches;
  } catch (error) {
    log(` ⚠ No matches for competition ${competitionId} and season ${seasonId}`, 'yellow');
    return [];
  }
}

// download events for a match
async function downloadEvents(matchId: number) {
  const url = `${BASE_URL}/events/${matchId}.json`;
  const outputPath = path.join(DATA_DIR, 'events', `${matchId}.json`);
  try {
    await downloadFile(url, outputPath);
    return true;
  } catch (error) {
    log(` ⚠ No events for match ${matchId}`, 'yellow');
    return false;
  }
}

// download lineups for a match
async function downloadLineups(matchId: number) {
  const url = `${BASE_URL}/lineups/${matchId}.json`;
  const outputPath = path.join(DATA_DIR, 'lineups', `${matchId}.json`);
  try {
    await downloadFile(url, outputPath);
    return true;
  } catch (error) {
    log(` ⚠ No events for match ${matchId}`, 'yellow');
    return false;
  }
}

async function main() {
  log('statsbomb downloader', 'blue');
  log('========================================', 'blue');

  const PRIORITY_COMPETITIONS = [
    'FIFA World Cup',
    'UEFA Champions League',
    'La Liga',
    'Premier League',
    'Bundesliga',
    'Serie A',
  ]

  try {

    // setup
    ensureDirectories();
    // download comp
    const competitions = await downloadCompetitions();

    // filter for world cup
    // const worldCups = competitions.filter((c: any) =>
    //   c.competition_name === 'FIFA World Cup'
    // );
    // log(`\n found ${worldCups.length} world cups seasons`, 'blue')

    // filter for priority competitions
    console.log(`\n competitions: ${Object.values(competitions).length}`)
    console.log(`\n competitions: ${Object.values(competitions)[1]}`)
    console.log('\n competitions:', competitions.length)
    const competitionsToDownload = Object.values(competitions).filter((c: any) => 
      PRIORITY_COMPETITIONS.includes(c.competition_name)
    );

    log(`\n found ${competitionsToDownload.length} priority competitions`, 'blue')

    // worldCups.forEach((wc: any) => {
    //   log(`\n downloading matches for ${wc.competition_name} ${wc.season_name}`, 'blue');
    // });

    let totalMatches = 0
    let totalEvents = 0

    for (const competition of competitionsToDownload) {
      log(`\n =======here `, 'blue');
      log(`\n Downloading ${competition.season_name} matches`, 'blue');
      const matches = await downloadMatches(competition.competition_id, competition.season_id);
      log(`\n =======here 2 `, 'blue');

      if (matches.length === 0) continue;

      totalMatches += matches.length;

      const matchesToDownload = matches.slice(0, 20) // Change to matches.length for all

      for (let i = 0; i < matchesToDownload.length; i++) {
        const match = matchesToDownload[i];
        log(`\n =======here 3 `, 'blue');
        log(`\n Downloading match ${match.match_id}`, 'blue');
        const [eventsOk, lineupsOk] = await Promise.all([
          downloadEvents(match.match_id),
          downloadLineups(match.match_id)
        ])
        log(`\n =======here 4 `, 'blue');
        if (eventsOk) totalEvents++
      }

      console.log('') // New line after progress
      log( `  ✓ Downloaded events for ${totalEvents} matches`, 'green')
    }
    log(`\n✅ Download complete!`, 'green')
    log(`📊 Summary:`, 'green')
    log(`  • Competitions: ${competitions.length}`, 'green')
    log( `  • Priority competitions: ${competitionsToDownload.length}`, 'green')
    log(`  • Total matches: ${totalMatches}`, 'green')
    log(`  • Events downloaded: ${totalEvents}`, 'green')
    
    log(`\n💡 Next step: Run "pnpm import-data" to upload to Supabase`, 'blue')
    
  } catch (error) {
    log(` ⚠ Error downloading matches: ${error.message}`, 'red');
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as downloadStatsBombData }

