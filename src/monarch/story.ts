import blackEyedSusans from '../assets/photos/black-eyed-susans.jpg';
import blackEyedSusansThumb from '../assets/photos/black-eyed-susans-thumb.jpg';
import caterpillarLeaf from '../assets/photos/caterpillar-leaf.jpg';
import caterpillarLeafThumb from '../assets/photos/caterpillar-leaf-thumb.jpg';
import caterpillarStem from '../assets/photos/caterpillar-stem.jpg';
import caterpillarStemThumb from '../assets/photos/caterpillar-stem-thumb.jpg';
import emerging from '../assets/photos/emerging.jpg';
import emergingThumb from '../assets/photos/emerging-thumb.jpg';
import mating from '../assets/photos/mating.jpg';
import matingThumb from '../assets/photos/mating-thumb.jpg';
import zinnia from '../assets/photos/zinnia.jpg';
import zinniaThumb from '../assets/photos/zinnia-thumb.jpg';
import { dateOf, YEAR_DAYS, type Chapter } from '../data/calendar';
import { GENERATIONS } from './generations';
import type { Activity } from './types';

export const CHAPTERS: Chapter[] = [
  {
    from: 0,
    title: 'The long winter',
    body: 'Millions of monarchs blanket the oyamel firs of Michoacán, packed into clusters against the mountain cold.',
  },
  {
    from: 55,
    title: 'The awakening',
    body: 'As the days grow longer, the super generation mates and sets off north in search of milkweed.',
    album: [
      {
        id: 'mating',
        src: mating,
        thumb: matingThumb,
        title: 'Spring flight',
        description: 'Warmer days stir the super generation. The first butterflies leave the firs to feed and mate.',
        alt: 'Two monarchs at a pink flower spike, one of them in flight.',
        credit: '1103489 on Pixabay',
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
        description: 'A monarch caterpillar eats nothing but milkweed, and the plant leaves it bitter to birds for life.',
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
    body: 'Living just a few weeks, they push the wave on into the Midwest.',
    album: [
      {
        id: 'emerging',
        src: emerging,
        thumb: emergingThumb,
        title: 'A new butterfly',
        description: 'After ten days or so in the chrysalis, the adult splits it open and hangs while its wings dry.',
        alt: 'A monarch hanging from its empty chrysalis just after emerging.',
        credit: 'Blackkeli on Pixabay',
      },
    ],
  },
  {
    from: 170,
    title: 'Reaching the lakes',
    body: 'Their granddaughters reach the Great Lakes, southern Canada and New England.',
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
        title: 'Summer in the north',
        description: 'Summer butterflies live only a few weeks, long enough to mate and leave eggs on the next patch of milkweed.',
        alt: 'Two monarchs resting on black-eyed Susans.',
        credit: 'StillWorld on Pixabay',
      },
    ],
  },
  {
    from: 250,
    title: 'The super generation',
    body: 'Born sexually immature, they live eight months and head southwest. None of them has ever been to Mexico.',
  },
  {
    from: 290,
    title: 'The Texas funnel',
    body: 'The whole population converges on a narrow corridor that crosses the Rio Grande and follows the Sierra Madre Oriental.',
  },
  {
    from: 305,
    title: 'Homecoming',
    body: 'They arrive around the Day of the Dead, in the same forest their great-great-grandmothers left. The cycle begins again.',
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
