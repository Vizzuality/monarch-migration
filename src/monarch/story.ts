import blackEyedSusans from '../assets/photos/black-eyed-susans.jpg';
import blackEyedSusansThumb from '../assets/photos/black-eyed-susans-thumb.jpg';
import caterpillarLeaf from '../assets/photos/caterpillar-leaf.jpg';
import caterpillarLeafThumb from '../assets/photos/caterpillar-leaf-thumb.jpg';
import caterpillarStem from '../assets/photos/caterpillar-stem.jpg';
import caterpillarStemThumb from '../assets/photos/caterpillar-stem-thumb.jpg';
import chrysalis from '../assets/photos/chrysalis.jpg';
import chrysalisThumb from '../assets/photos/chrysalis-thumb.jpg';
import clusterBranch from '../assets/photos/cluster-branch.jpg';
import clusterBranchThumb from '../assets/photos/cluster-branch-thumb.jpg';
import dandelion from '../assets/photos/dandelion.jpg';
import dandelionThumb from '../assets/photos/dandelion-thumb.jpg';
import emerging from '../assets/photos/emerging.jpg';
import emergingThumb from '../assets/photos/emerging-thumb.jpg';
import freshGoldenrod from '../assets/photos/fresh-goldenrod.jpg';
import freshGoldenrodThumb from '../assets/photos/fresh-goldenrod-thumb.jpg';
import frostweed from '../assets/photos/frostweed.jpg';
import frostweedThumb from '../assets/photos/frostweed-thumb.jpg';
import goldenrodPair from '../assets/photos/goldenrod-pair.jpg';
import goldenrodPairThumb from '../assets/photos/goldenrod-pair-thumb.jpg';
import hangingClusters from '../assets/photos/hanging-clusters.jpg';
import hangingClustersThumb from '../assets/photos/hanging-clusters-thumb.jpg';
import layingEggs from '../assets/photos/laying-eggs.jpg';
import layingEggsThumb from '../assets/photos/laying-eggs-thumb.jpg';
import lifeStages from '../assets/photos/life-stages.jpg';
import lifeStagesThumb from '../assets/photos/life-stages-thumb.jpg';
import mating from '../assets/photos/mating.jpg';
import matingThumb from '../assets/photos/mating-thumb.jpg';
import oyamelBranch from '../assets/photos/oyamel-branch.jpg';
import oyamelBranchThumb from '../assets/photos/oyamel-branch-thumb.jpg';
import reserveMountains from '../assets/photos/reserve-mountains.jpg';
import reserveMountainsThumb from '../assets/photos/reserve-mountains-thumb.jpg';
import roostBranch from '../assets/photos/roost-branch.jpg';
import roostBranchThumb from '../assets/photos/roost-branch-thumb.jpg';
import roostTreetops from '../assets/photos/roost-treetops.jpg';
import roostTreetopsThumb from '../assets/photos/roost-treetops-thumb.jpg';
import sanctuaryCluster from '../assets/photos/sanctuary-cluster.jpg';
import sanctuaryClusterThumb from '../assets/photos/sanctuary-cluster-thumb.jpg';
import streamBank from '../assets/photos/stream-bank.jpg';
import streamBankThumb from '../assets/photos/stream-bank-thumb.jpg';
import swarmSky from '../assets/photos/swarm-sky.jpg';
import swarmSkyThumb from '../assets/photos/swarm-sky-thumb.jpg';
import tagging from '../assets/photos/tagging.jpg';
import taggingThumb from '../assets/photos/tagging-thumb.jpg';
import zinnia from '../assets/photos/zinnia.jpg';
import zinniaThumb from '../assets/photos/zinnia-thumb.jpg';
import { dateOf, YEAR_DAYS, type Chapter } from '../data/calendar';
import { GENERATIONS } from './generations';
import type { Activity } from './types';

export const STORY_TITLE = 'Flight of the Monarchs';

export const CHAPTERS: Chapter[] = [
  {
    from: 0,
    title: 'The long winter',
    body: 'Millions of monarchs blanket the oyamel firs of Michoacán, packed into clusters against the mountain cold.',
    album: [
      {
        id: 'hanging-clusters',
        src: hangingClusters,
        thumb: hangingClustersThumb,
        title: 'Living curtains',
        description: 'So many butterflies hang from the oyamel firs that whole branches bend under their weight.',
        alt: 'Dense clusters of monarchs hanging from the trunks and branches of tall firs.',
        credit: 'Alejandro Linares García, CC BY-SA 4.0',
      },
      {
        id: 'cluster-branch',
        src: clusterBranch,
        thumb: clusterBranchThumb,
        title: 'Huddled together',
        description: 'Packed wing to wing, the clusters keep each butterfly a little warmer and drier through the cold nights.',
        alt: 'A close view of hundreds of monarchs with folded wings packed onto a branch.',
        credit: 'Alejandro Linares García, CC BY-SA 4.0',
      },
      {
        id: 'oyamel-branch',
        src: oyamelBranch,
        thumb: oyamelBranchThumb,
        title: 'Waiting for the sun',
        description: 'With their wings closed they barely move, saving the fat they stored up on the way south.',
        alt: 'Monarchs covering the needles of a fir branch.',
        credit: 'Lori Nordstrom, USFWS',
      },
    ],
  },
  {
    from: 55,
    title: 'The awakening',
    body: 'As the days grow longer, the butterflies finally mate and set off north in search of milkweed.',
    album: [
      {
        id: 'swarm-sky',
        src: swarmSky,
        thumb: swarmSkyThumb,
        title: 'The forest takes off',
        description: 'On warm afternoons millions of monarchs pour off the trees at once and fill the sky over the forest.',
        alt: 'A swarm of monarchs flying against a blue sky between fir trees heavy with butterflies.',
        credit: 'Lori Nordstrom, USFWS',
      },
      {
        id: 'mating',
        src: mating,
        thumb: matingThumb,
        title: 'Spring flight',
        description: 'Warmer days stir the super generation. The first butterflies leave the firs to feed and mate.',
        alt: 'Two monarchs at a pink flower spike, one of them in flight.',
        credit: '1103489 on Pixabay',
      },
      {
        id: 'stream-bank',
        src: streamBank,
        thumb: streamBankThumb,
        title: 'A drink before leaving',
        description: 'As the season warms they come down from the firs to drink at streams and damp ground.',
        alt: 'Hundreds of monarchs on the mossy bank of a forest stream.',
        credit: 'Alejandro Linares García, CC BY-SA 4.0',
      },
    ],
  },
  {
    from: 85,
    title: 'The first eggs',
    body: 'The travelers lay their eggs in Texas and Oklahoma, then die. Their daughters take over.',
    album: [
      {
        id: 'caterpillar-stem',
        src: caterpillarStem,
        thumb: caterpillarStemThumb,
        title: 'Milkweed only',
        description: 'A monarch caterpillar eats nothing but milkweed, which makes it taste bitter to birds.',
        alt: 'A striped monarch caterpillar climbing a milkweed stem.',
        credit: 'lookalikejlee on Pixabay',
      },
      {
        id: 'caterpillar-leaf',
        src: caterpillarLeaf,
        thumb: caterpillarLeafThumb,
        title: 'Two weeks of eating',
        description: 'In about two weeks a caterpillar grows from a speck to the length of a finger.',
        alt: 'A monarch caterpillar on a milkweed leaf among orange flowers.',
        credit: 'BizCoachGeneva on Pixabay',
      },
    ],
  },
  {
    from: 115,
    title: 'The relay',
    body: 'The daughters live just a few weeks, long enough to carry the wave into the Midwest where the granddaughters hatch.',
    album: [
      {
        id: 'chrysalis',
        src: chrysalis,
        thumb: chrysalisThumb,
        title: 'A green lantern',
        description: 'Inside the chrysalis the caterpillar rebuilds itself into a butterfly. The gold dots are still a mystery.',
        alt: 'A jade-green monarch chrysalis with gold dots, hanging from a twig and covered in raindrops.',
        credit: 'K. Stoll, NPS',
      },
      {
        id: 'emerging',
        src: emerging,
        thumb: emergingThumb,
        title: 'A new butterfly',
        description: 'After ten days inside, the adult splits open the chrysalis and hangs while its wings dry.',
        alt: 'A monarch hanging from its empty chrysalis just after emerging.',
        credit: 'Blackkeli on Pixabay',
      },
    ],
  },
  {
    from: 170,
    title: 'Reaching the lakes',
    body: 'The granddaughters reach the Great Lakes, southern Canada and New England.',
    album: [
      {
        id: 'zinnia',
        src: zinnia,
        thumb: zinniaThumb,
        title: 'Fuel for the road',
        description: 'Adults sip nectar from garden and prairie flowers to keep going north.',
        alt: 'A monarch feeding on a pale pink zinnia.',
        credit: 'Jim_Combs on Pixabay',
      },
      {
        id: 'dandelion',
        src: dandelion,
        thumb: dandelionThumb,
        title: 'Early fuel',
        description: 'In Minnesota a female stops at the spring dandelions between milkweed plants, laying one egg on each.',
        alt: 'A monarch sipping from a yellow dandelion among seed heads.',
        credit: 'Courtney Celley, USFWS',
      },
    ],
  },
  {
    from: 215,
    title: 'Northern summer',
    body: 'The great-granddaughters spread out across the north and lay the eggs of the next super generation.',
    album: [
      {
        id: 'black-eyed-susans',
        src: blackEyedSusans,
        thumb: blackEyedSusansThumb,
        title: 'Short lives',
        description: 'Summer butterflies live only a few weeks, long enough to mate and leave eggs on the next patch of milkweed.',
        alt: 'Two monarchs resting on black-eyed Susans.',
        credit: 'StillWorld on Pixabay',
      },
      {
        id: 'laying-eggs',
        src: layingEggs,
        thumb: layingEggsThumb,
        title: 'One egg at a time',
        description: 'Even with tattered wings, a female keeps laying, choosing young milkweed with tender leaves.',
        alt: 'A monarch with worn wings curling her abdomen under a small milkweed plant.',
        credit: 'Courtney Celley, USFWS',
      },
      {
        id: 'life-stages',
        src: lifeStages,
        thumb: lifeStagesThumb,
        title: 'The whole cycle',
        description: 'In the summer heat an egg becomes a butterfly in about a month, so several generations fit into one season.',
        alt: 'Monarch caterpillars of different sizes and an adult butterfly on a milkweed leaf.',
        credit: 'U.S. Fish and Wildlife Service',
      },
    ],
  },
  {
    from: 250,
    title: 'The super generation',
    body: 'This remarkable generation lives 8 times longer. Instead of breeding, they save their strength for a long journey. None of them has ever been to Mexico.',
    album: [
      {
        id: 'fresh-goldenrod',
        src: freshGoldenrod,
        thumb: freshGoldenrodThumb,
        title: 'Born for the journey',
        description: 'Butterflies that emerge in late summer stay unmated and build up fat instead, ready for the flight south.',
        alt: 'A freshly emerged monarch resting on stiff goldenrod.',
        credit: 'Tina Shaw, USFWS',
      },
      {
        id: 'goldenrod-pair',
        src: goldenrodPair,
        thumb: goldenrodPairThumb,
        title: 'Filling up',
        description: 'Goldenrod blooms just as the migration starts, and its nectar becomes the fat that will carry them to Mexico.',
        alt: 'Two monarchs feeding on yellow goldenrod flowers.',
        credit: 'Joanna Gilkeson, USFWS',
      },
      {
        id: 'tagging',
        src: tagging,
        thumb: taggingThumb,
        title: 'A sticker for the road',
        description: 'Volunteers tag thousands of migrants every fall. Tags found in Mexico revealed where the journey ends.',
        alt: 'Hands holding a monarch with a small round tag on its hind wing.',
        credit: 'Brett Billings, USFWS',
      },
    ],
  },
  {
    from: 290,
    title: 'The Texas funnel',
    body: 'The whole population converges on a narrow corridor that crosses the Rio Grande and follows the Sierra Madre Oriental.',
    album: [
      {
        id: 'roost-branch',
        src: roostBranch,
        thumb: roostBranchThumb,
        title: 'A night together',
        description: 'Along the way they gather every evening in the same trees, hundreds or thousands at a time.',
        alt: 'Dozens of monarchs roosting on the leaves of a tree at dusk.',
        credit: 'Mike Budd, USFWS',
      },
      {
        id: 'roost-treetops',
        src: roostTreetops,
        thumb: roostTreetopsThumb,
        title: 'Waiting out the wind',
        description: 'On cold or windy days the roosts stay put until the air warms and the wind turns south again.',
        alt: 'Monarchs clustered among the leaves of a treetop.',
        credit: 'U.S. Forest Service',
      },
      {
        id: 'frostweed',
        src: frostweed,
        thumb: frostweedThumb,
        title: 'Crossing Texas',
        description: 'Fall flowers like frostweed along the way are the last big meals before Mexico.',
        alt: 'A monarch with open wings feeding on white frostweed flowers in Texas.',
        credit: 'Shauna Marquardt, USFWS',
      },
    ],
  },
  {
    from: 305,
    title: 'Homecoming',
    body: 'They arrive around the Day of the Dead, in the same forest their great-great-grandmothers left. The cycle begins again.',
    album: [
      {
        id: 'sanctuary-cluster',
        src: sanctuaryCluster,
        thumb: sanctuaryClusterThumb,
        title: 'Back in the firs',
        description: 'The newcomers settle in the same high forests, filling them with clusters by the thousand.',
        alt: 'Huge clusters of monarchs covering the branches and trunk of a fir.',
        credit: 'Adam Jones, CC BY-SA 2.0',
      },
      {
        id: 'reserve-mountains',
        src: reserveMountains,
        thumb: reserveMountainsThumb,
        title: 'The mountains of the monarch',
        description: 'The butterflies only winter on a handful of fir-covered peaks in central Mexico, now protected as a biosphere reserve.',
        alt: 'Forested mountains and valleys of the Monarch Butterfly Biosphere Reserve under a blue sky.',
        credit: 'Rafael Saldaña, CC BY 2.0',
      },
    ],
  },
];

/** What the story shows on one day of the year. */
export interface StoryDay {
  /** The whole day of the year, from 0 to YEAR_DAYS - 1. */
  today: number;
  date: { date: number; month: string };
  chapter: Chapter;
  dominant: (typeof GENERATIONS)[number];
}

function chapterAt(today: number): Chapter {
  let current = CHAPTERS[0];
  for (const c of CHAPTERS) if (today >= c.from) current = c;
  return current;
}

/** The story on `day`, which may be fractional or run past either end of the year. */
export function storyAt(activity: Activity, day: number): StoryDay {
  const today = ((Math.floor(day) % YEAR_DAYS) + YEAR_DAYS) % YEAR_DAYS;
  return { today, date: dateOf(today), chapter: chapterAt(today), dominant: GENERATIONS[activity.dominant[today]] };
}
