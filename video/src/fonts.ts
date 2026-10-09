import { loadFont } from '@remotion/fonts';
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';
import { staticFile } from 'remotion';
import { SANS } from './theme';

export const MONO = loadJetBrainsMono('normal', { weights: ['400', '700'], subsets: ['latin'] }).fontFamily;
export const fontsReady: Promise<void> = loadFont({ family: SANS, url: staticFile('fonts/PretendardVariable.woff2'), weight: '100 900' });
