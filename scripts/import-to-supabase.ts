import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import type { Database } from "@/types/database";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function log(color:keyof typeof colors, message: string) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function importCompetitions() {
  log('blue', 'Importing competitions');

  const filePath = path.join(DATA_DIR, 'competitions.json');
  const competitions = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const transformedMap = new Map();
  for (const c of competitions) {
    transformedMap.set(c.competition_id, {
      competition_id: c.competition_id,
      competition_name: c.competition_name,
      season_name: c.season_name,
    });
  }

  const transformed = Array.from(transformedMap.values());

  // const transformed = competitions.map((c: any) => ({
  //   competition_id: c.competition_id,
  //   competition_name: c.competition_name,
  //   season_name: c.season_name,
  // }))

  log('green', `Transformed ${transformed.length} competitions`);

  const { data, error } = await supabase
    .from('competitions')
    .upsert(transformed, { onConflict: 'competition_id' })
    .select();

  if (error) throw error;

  return data
}

async function importMatches() {
  log('blue', 'Importing matches');

  const matchDir = path.join(DATA_DIR, 'matches');
  const files = fs.readdirSync(matchDir);

  let totalMatches = 0;

  for (const file of files) {
    const filePath = path.join(matchDir, file);
    const matches = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const transformed = matches.map((m: any) => ({
      match_id: m.match_id,
      competition_id: m.competition.competition_id,
      season_name: m.season.season_name,
      match_date: m.match_date,
      kickoff_time: m.kick_off && m.match_date 
      ? `${m.match_date}T${m.kick_off}Z`  // Creates "2004-02-07T16:00:00.000Z"
      : null,
      home_team_id: m.home_team.home_team_id,
      home_team_name: m.home_team.home_team_name,
      away_team_id: m.away_team.away_team_id,
      away_team_name: m.away_team.away_team_name,
      home_team_score: m.home_score,
      away_team_score: m.away_score,
      stadium_name: m.stadium?.name || null,
      referee_name: m.referee?.name || null,
      match_status: m.match_status,
      last_updated: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('matches')
      .upsert(transformed, { onConflict: 'match_id' })
      .select();

    if (error) throw error;

    totalMatches += data?.length || 0;
  }

  log('green', `Imported ${totalMatches} matches`);
  return totalMatches;
}

async function importLineups() {
  log('blue', 'Importing lineups');

  const lineupDir = path.join(DATA_DIR, 'lineups');
  
  if (!fs.existsSync(lineupDir)) {
    log('yellow', 'No lineups found');
    return 0;
  }

  const files = fs.readdirSync(lineupDir);

  let totalLineups = 0;
  let totalPlayers = 0;

  for (const file of files) {
    const matchId = parseInt(file.replace('.json', ''));
    const filePath = path.join(lineupDir, file);
    const lineups = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    //extract unique players
    const players = new Map()
    const lineupsToInsert = [];

    for (const team of lineups) {
      for (const player of team.lineup) {
        //Add players to map
        if (!players.has(player.player_id)) {
          players.set(player.player_id, {
            player_id: player.player_id,
            player_name: player.player_name,
            player_nickname: player.player_nickname || null,
            jersey_number: player.jersey_number,
            country: player.country?.name,
            player_age: player.player_age || null,
            player_position: player.positions?.[0]?.position || null,
          });
        }

        //Add lineups to insert
        lineupsToInsert.push({
          match_id: matchId,
          player_id: player.player_id,
          team_id: team.team_id,
          team_name: team.team_name,
          position_name: player.positions?.[0]?.position || null,
          jersey_number: player.jersey_number,
        });
      }
    }

    if (players.size > 0) {
      const { error: playersError } = await supabase
        .from('players')
        .upsert(Array.from(players.values()), { onConflict: 'player_id' })
        .select();
  
      if (playersError) throw playersError;
  
      totalPlayers += players.size;
    }

    //insert lineups
    if(lineupsToInsert.length > 0) {
      const { error: lineupsError } = await supabase
        .from('lineups')
        .upsert(lineupsToInsert, { onConflict: 'match_id, player_id, team_id' })
        .select();

      if (lineupsError) throw lineupsError;
      totalLineups += lineupsToInsert.length;
    }
  }

  log('green', `Imported ${totalLineups} lineups`);
  log('green', `Imported ${totalPlayers} players`);
  return { totalLineups, totalPlayers };
}

async function importEvents() {
  log('blue', 'Importing events');

  const eventDir = path.join(DATA_DIR, 'events');
  if (!fs.existsSync(eventDir)) {
    log('yellow', 'No events found');
    return 0;
  }

  const files = fs.readdirSync(eventDir);
  let totalEvents = 0;
  const batchSize = 100;

  for (let i = 0; i < files.length; i++) {
    const file  = files[i]
    const matchId = parseInt(file.replace('.json', ''));
    const filePath = path.join(eventDir, file);
    process.stdout.write(
      `\r  ⏳ Processing match ${i + 1}/${files.length} (${matchId})...`
    )
    const events = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const transformed = events.map((e: any) => ({
      event_id: e.id,
      match_id: matchId,
      period: e.period || null,
      minute: e.minute,
      second: e.second,
      timestamp: e.timestamp,
      event_type: e.type?.name,
      event_type_id: e.type?.id,
      player_id: e.player?.id,
      player_name: e.player?.name,
      team_id: e.team?.id,
      team_name: e.team?.name,
      possession_team_id: e.possession_team?.id,
      possession_team_name: e.possession_team?.name,
      location_x: e.location?.[0],
      location_y: e.location?.[1],
      end_location_x: e.pass?.end_location?.[0] || e.shot?.end_location?.[0] || e.carry?.end_location?.[0],
      end_location_y: e.pass?.end_location?.[1] || e.shot?.end_location?.[1] || e.carry?.end_location?.[1],
      outcome_name: e.pass?.outcome?.name || e.shot?.outcome?.name || e.carry?.outcome?.name || e.challenge?.outcome?.name || e.foul?.outcome?.name || e.card?.outcome?.name || e.goal?.outcome?.name || e.penalty?.outcome?.name || e.substitution?.outcome?.name || e.other?.outcome?.name,
      event_data: e,
    }));
    
    // try {
      for (let j = 0; j < transformed.length; j += batchSize) {
        const batch = transformed.slice(j, j + batchSize);
        const { error: eventsError } = await supabase
          .from('events')
          .upsert(batch, { onConflict: 'match_id, event_id', ignoreDuplicates: true })

        if (eventsError) {
          if (eventsError.code === '23505') {
            // Duplicate key - ignore and continue
            continue;
          }
          throw eventsError;
        }
        // if (eventsError) throw eventsError;
        totalEvents += batch.length;
      }
    // } catch (error) {
    //   log('red', `\n  ❌ Error processing match ${matchId}: ${error.message}`);
    //   log('yellow', `  ⚠ Skipping match ${matchId} and continuing...`);
    //   // continue;
    // }
  }
  console.log('\n');
  log('green', `Imported ${totalEvents} events`);
  return totalEvents;
}

async function main() {
  log('blue', 'Importing data to Supabase');
  log('blue', '========================================');

  const startTime = Date.now();

  try {
    const{error: testError} = await supabase
    .from('competitions')
    .select('count')
    .limit(1);

    if (testError && !testError.message.includes('count')) {
      throw new Error(`Connection failed: ${testError.message}`)
    }

    log('green', `Connected to Supabase in ${Date.now() - startTime}ms`);

    await importCompetitions();
    await importMatches();
    await importLineups();
    const totalEvents = await importEvents();

    const duration = ((Date.now() - startTime)/1000).toFixed(2);

    log('green', '\n✅ Import complete!')
    log('green', ` Total time: ${duration}s`)
    log('green', `Data loaded:`)
    log('green', `  • Competitions: Check Supabase dashboard`)
    log('green', `  • Matches: Check Supabase dashboard`)
    log('green', `  • Players: Check Supabase dashboard`)
    log('green', `  • Events: ${totalEvents.toLocaleString()}`)
    
    log('blue', '\n💡 Next: Run your React app to query the data!')
  } catch (error) {
    log('red', `Error importing events: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as importToSupabase }