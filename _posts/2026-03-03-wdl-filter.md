---
layout: post
title: "wdl-filter, a simple command line tool to help solve Wordle puzzles"
date: 2026-03-03 23:00:00 -0500
excerpt: I have a little script to help me solve the day’s Wordle puzzle.
tags: [programming]
---

# wdl-filter, a simple command line tool to help solve Wordle puzzles

![Wordle results](/assets/images/wdl-filter_results.png "Wordle results")

Like a lot of people, I try to solve the New York Times-owned Wordle puzzle each day. 

Like …a smaller, but [still significant](https://github.com/search?q=wordle&type=repositories) number of people, I’ve treated Wordle as a scripting execise.

To wit:

Mac & Linux computers come with [a built-in word list](https://en.wikipedia.org/wiki/Words_%28Unix%29), typically at `/usr/share/dict/words`. It’s easy enough to pull out the five-letter words from this list to use as a starting point for solving the day’s word puzzle:

* `grep '^.....$' /usr/share/dict/words > ~/wordle-words.txt`

It’s also possible to [reverse engineer the Javascript in Wordle](https://reichel.dev/blog/reverse-engineering-wordle.html#looking-at-the-source), and just automate finding the day’s word, but that would be cheating. 

I did, however, find it useful to play around with analyzing the letter frequencies in the built-in word list. As any Scrabble player knows, the most common letters in English are E, A, I, O, T, N, S, R, L, and U. But we’re talking about Wordle, not Scrabble, and for Wordle, it’s more important to know which letters are the most common at each of the five possible positions within the word list.  

Something like this:

![Wordle letter frequencies by word position](/assets/images/wdl-filter_results.png "Wordle letter frequencies by word position")

This paints a different picture!

* For the first letter, the most common letters are S, C, B, T, P.
* For the second letter, the most common letters are A, O, R, E, I.
* For the third letter, the most common letters are A, I, O, E, U.
* For the fourth letter, the most common letters are E, N, S, L, A.
* For the fifth letter, the most common letters are E, Y, T, R, L.

And so on. So it’s not just that we want to pick words with the top _overall_ letters, but words with letters that are likely to be both correct _and_ in the right position on an early guess.

That led me to play around with spreadsheets for a bit, and without getting bogged down in details, I came up with this:

![Top Wordle words, accounting for letter frequency & letter position](/assets/images/wordle_top_words.png "Top Wordle words, accounting for letter frequency & letter position")

And that’s how `SLATE` ended up being my standard starting word for Wordle. (It was already the day’s word a while ago, so I probably won't get another “hole in one” unless the shuffle the word list or cycle back around to it, but that’s okay.)

From there, I spent a while treating Wordle as a little shell scripting exercise, where I’d guess `SLATE` and then filter the results with `grep` and friends to narrow down the results, and generate a list of the most common letters by position. And that was fine for a while.

But then vibe coding came along, and like everybody else in tech, playing around with getting an LLM to help you generate software has become _de rigeur_. Having Claude take a crack at overhauling my Wordle script seemed like a decent little sandbox to start with. 

One of the first things I had it do was rewrite the script from Bash to Python. I started out with Bash to “keep things simple”, but in the grand tradition of all non-ephemeral shell scripts, a point came along where it made sense to use a Real Programming Language™, like Python. 

To the surprise of nobody, Claude’s rewrite of the script worked just fine — same inputs, same output, no problem. The only obvious difference was that it now ran around ten times faster. 

But I couldn’t just stop there, right?

Recently, I noticed that the script was suggesting words that _technically_ were good guesses, on grounds that they had “probable” letters at some of the remaining positions, but the actual words were nonsense, and it was unfathomable to imagine that they could actually be the day’s real answer. Words like this might be good for whittling down the list of remaining words, but in practice, the day’s Wordle word is almost always a fairly common term, and any self-respecting helper tool should take this into account.

To the surprise of nobody, Claude was able to make some good suggestions for getting a list of common English words, and coming up with some heuristics to show both the letter-position-probability figures as well as the word-frequency figures. This version of the tool provided feedback about the best words to guess next, based on a chain of `grep` filters to show which letters matched (or were excluded) from current guesses. 

This worked great, but now the chain of `grep` filters was getting monotonous. What I really wanted now was to just run the filter command, tell it what words I’ve guessed so far, and annotate that with the letters that do & don’t match the day’s puzzle.

To the surprise of nobody, Claude was able to help come up with a handy little syntax for specifying matches, without needing the `grep` input chain.

Here’s a sample of how the tool worked with today’s puzzle, which ended up being `LINEN`:

```
$ wdl-filter slate:_y__y
Guesses:
  slate  _y__y

matching words: 283
 l 72   r 19   p 17   m 16   b 15   c 15   f 14   k 13   d 13   h 12   o 12   w 10   j 10   n  9   g  8   v  7   e  6   y  4   u  4   i  4   z  1   x  1   q  1
 e 117   o 53   i 45   u 24   h  8   n  7   y  6   r  5   x  3   m  3   w  3   g  2   d  2   c  1   p  1   b  1   v  1   j  1
 l 100   e 29   v 22   r 17   m 12   b 12   d 11   w 10   p  9   z  8   g  8   x  7   n  7   k  6   u  6   f  5   c  4   i  4   o  4   h  1   y  1
 e 177   l 48   i 22   o 10   c  9   g  4   u  3   y  3   z  2   r  2   p  2   n  1
 l 89   d 55   y 45   r 29   n 15   o 12   h  9   m  7   i  5   p  4   x  4   g  3   k  2   c  2   w  1   b  1

| egrep "[lrpmb][eoiuh][levrm][elioc][ldyrn]"   # all letters
| egrep "[lrpmb][eoiuh][levrm][elioc][ldyrn]"   # freq >= 2
| egrep "[lrpmb][eoiuh][levrm][elioc][ldyrn]"   # freq >= 3

# Top 30 words (by composite score = match x freq^3):
     level (144.30, 0.6713)     model ( 97.43, 0.6555)     lower ( 73.70, 0.6001)     reply ( 69.97, 0.6649)     below ( 66.25, 0.6484)     devel ( 63.79, 0.5344)
     filed ( 61.72, 0.5404)     kelly ( 50.85, 0.5400)     field ( 50.85, 0.6433)     loved ( 50.18, 0.5097)     novel ( 48.29, 0.5167)     lived ( 47.37, 0.5036)
     hello ( 46.87, 0.5453)     wheel ( 45.84, 0.5271)     liver ( 37.22, 0.4760)     liked ( 37.08, 0.4710)     lover ( 33.70, 0.4571)     rebel ( 33.61, 0.4330)
     excel ( 32.14, 0.4866)     pixel ( 31.31, 0.4538)     newly ( 31.17, 0.5144)     jewel ( 30.37, 0.4224)     devil ( 29.10, 0.4801)     ruled ( 28.23, 0.4222)
     belly ( 27.91, 0.4412)     celeb ( 27.83, 0.4079)     lined ( 27.29, 0.4248)     riley ( 25.89, 0.4063)     lever ( 24.94, 0.3911)     linen ( 22.41, 0.4139)

# Distribution: 15 very common (>0.5), 124 common (0.1-0.5), 37 uncommon (0.01-0.1)
# Freq format scaled to max=0.6713 (max in set); composite = match x freq^3 (dynamic)
$ wdl-filter slate:_y__y level:g__g_
Guesses:
  slate  _y__y
  level  g__g_

matching words: 38
 l 38
 o 15   i 14   u  9
 n  5   m  5   k  4   w  3   x  3   r  3   g  3   b  3   p  2   o  2   f  2   z  1   u  1   d  1
 e 38
 d 14   r 11   n  7   y  5   x  1

| egrep "[l][oiu][nmkwx][e][drnyx]"   # all letters
| egrep "[l][oiu][nmkwx][e][drny]"   # freq >= 2
| egrep "[l][oiu][nmkwx][e][drny]"   # freq >= 3

# Top 30 words (by composite score = match x freq^2):
     lower ( 37.81, 0.6001)     liked ( 23.95, 0.4710)     lined ( 19.67, 0.4248)     liner ( 17.56, 0.4070)     linen ( 17.48, 0.4139)     lumen (  7.56, 0.2791)
     lured (  6.37, 0.2500)     liber (  5.98, 0.2397)     loner (  4.70, 0.2096)     luger (  3.96, 0.1999)     lowed (  3.52, 0.1805)     lobed (  2.98, 0.1661)
     lurex (  2.67, 0.1731)     liken (  2.67, 0.1625)     lifer (  2.58, 0.1584)     liger (  2.43, 0.1528)     limey (  2.34, 0.1528)     loper (  1.81, 0.1319)
     lubed (  1.57, 0.1240)     loden (  1.48, 0.1223)     lowen (  1.43, 0.1190)     limed (  0.73, 0.0817)     lokey (  0.71, 0.0845)     liker (  0.36, 0.0588)
     loped (  0.16, 0.0384)     lomed (  0.00, 0.0001)     loxed (  0.00, 0.0001)     looed (  0.00, 0.0001)     loued (  0.00, 0.0001)     luxed (  0.00, 0.0001)

# Distribution: 1 very common (>0.5), 20 common (0.1-0.5), 4 uncommon (0.01-0.1)
# Freq format scaled to max=0.6001 (max in set); composite = match x freq^2 (dynamic)
$ wdl-filter slate:_y__y level:g__g_ lobed:g__g_
Guesses:
  slate  _y__y
  level  g__g_
  lobed  g__g_

matching words: 15
 l 15
 i 10   u  5
 m  3   n  3   r  2   g  2   k  2   f  2   x  1
 e 15
 r  7   n  4   y  3   x  1

| egrep "[l][iu][mnrgk][e][rnyx]"   # all letters
| egrep "[l][iu][mnrgk][e][rny]"   # freq >= 2
| egrep "[l][iu][mn][e][rny]"   # freq >= 3

# All 15 words (by composite score = match x freq^1.5):
     liner ( 12.98, 0.4070)     linen ( 12.52, 0.4139)     lumen (  6.19, 0.2791)     luger (  3.93, 0.1999)     lifer (  3.09, 0.1584)     liken (  3.01, 0.1625)
     liger (  2.93, 0.1528)     limey (  2.75, 0.1528)     lurex (  2.74, 0.1731)     liker (  0.70, 0.0588)     limen (  0.00, 0.0001)     liney (  0.00, 0.0001)
     lifey (  0.00, 0.0001)     lurer (  0.00, 0.0001)     luxer (  0.00, 0.0001)

# Distribution: 0 very common (>0.5), 9 common (0.1-0.5), 1 uncommon (0.01-0.1)
# Freq format scaled to max=0.4139 (max in set); composite = match x freq^1.5 (dynamic)
$ wdl-filter slate:_y__y level:g__g_ lobed:g__g_ liner:gggg_
Guesses:
  slate  _y__y
  level  g__g_
  lobed  g__g_
  liner  gggg_

matching words: 2
 l  2
 i  2
 n  2
 e  2
 y  1   n  1

| egrep "[l][i][n][e][yn]"   # all letters
| egrep "[l][i][n][e]."   # freq >= 2
| egrep "....."   # freq >= 3

# All 2 words (by composite score = match x freq^1):
     linen (  3.73, 0.4139)     liney (  0.00, 0.0001)

# Distribution: 0 very common (>0.5), 1 common (0.1-0.5), 0 uncommon (0.01-0.1)
# Freq format scaled to max=0.4139 (max in set); composite = match x freq^1 (dynamic)
$ wdl-filter slate:_y__y level:g__g_ lobed:g__g_ liner:gggg_
$                                                           
```

This is the version I’ve been using for a couple weeks or so now. It’s working well enough that I figure I might as well post it publicly to GitHub, so here it is:

* https://github.com/cdevers/wordle-filter

Realistically, I don't expect this to be a runaway hit, so much as me publicly scratching a particular itch that maybe, just maybe, a small number of other folks might share, too. 

If you’re one of those folks — give it a try, and let me know what you think!
