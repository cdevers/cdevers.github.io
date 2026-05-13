---
layout: post
title: "Filing Vivian Maier"
date: 2026-05-12 19:18:43 -0400
excerpt: Everybody else is vibe coding, so why can't we? My current experiment with this is Blue Pearmain, an open source framework for harmonizing Apple Photos and Flickr libraries. 
tags: [ai, photography, programming]
carousel_images:
  - path: "/assets/images/blog/2026-05-12/BP-2-review.png" 
    alt: "Blue Pearmain, main photo review UI" 
    caption: "Blue Pearmain, main photo review UI" 
  - path: "/assets/images/blog/2026-05-12/BP-3-faces.png" 
    alt: "Blue Pearmain, persons page" 
    caption: "Blue Pearmain, persons page" 
  - path: "/assets/images/blog/2026-05-12/BP-4-geozones.png" 
    alt: "Blue Pearmain, geofencing page" 
    caption: "Blue Pearmain, geofencing page" 
  - path: "/assets/images/blog/2026-05-12/BP-5-duplicates.png" 
    alt: "Blue Pearmain, review duplicates page" 
    caption: "Blue Pearmain, review duplicates page" 
  - path: "/assets/images/blog/2026-05-12/BP-6-proposals.png" 
    alt: "Blue Pearmain, proposals page, for resolving metadata conflicts" 
    caption: "Blue Pearmain, proposals page, for resolving metadata conflicts" 

---

Like pretty much everyone else that works with computers these days, I’ve been playing around with AI tools and figuring out what it means to operate in an era where, as many have pointed out, English is becoming the primary programming language.

I started out with something small. I already had a simple Bash shell script to help solve the day’s Wordle puzzle, so I took a crack at having Claude modernize it, first by porting it to Python, then coming up with a web interface that runs a self-contained Javascript version of the solver. I [wrote about it here](https://cdevers.github.io/2026/03/04/wdl-filter.html); the project can be found on GitHub at [ wordle-filter](https://github.com/cdevers/wordle-filter).

But what about something more substantial?

{% include image.html 
   path="/assets/images/blog/2026-05-12/Vivian-Maier-selfie.png" 
   alt="Vivian Maier, self-portrait" 
   caption='<a href="https://en.wikipedia.org/wiki/Vivian_Maier">Vivian Maier</a>, self-portrait' 
   width="700" %}

I’m an amateur photographer. I’m no [Vivian Maier](https://en.wikipedia.org/wiki/Vivian_Maier), and nobody’s making [a documentary about my work](https://en.wikipedia.org/wiki/Finding_Vivian_Maier), but like her, my photo archive is pretty large — over the course of decades, it’s now solidly into six-digit number territory. And like her approach to archiving — lots and lots and lots of boxes of film, much of it undeveloped — my photo archive is, well, it’s not _that_ disorganized, but certainly not curated as well as it could be.
 
I’m also [a long-time user of Flickr](https://www.flickr.com/photos/cdevers), the photo-sharing social media platform that the world seems to have forgotten. Among the many reasons I like Flickr is the fact that the iOS app automatically backs up your photos, so you can have your photo archive replicated there, and choose whether or not you actually share the photos more broadly.

The catch is, to [borrow a phrase](https://regex.info/blog/2006-09-15/247): 

> Some people, when confronted with a photo library management problem, think
> 
> “I know, I'll use an online service.”   Now they have two photo library management problems.

And there it is: managing one instance of the library is a chore, but managing two divergent versions is more than twice as much work, because not only do you have to manage both of them, but you also have to keep them synchronized.

## Can AI help?

{% include image.html 
   path="/assets/images/blog/2026-05-12/BP-1-home.png" 
   alt="Blue Pearmain, home page" 
   caption="Blue Pearmain, home page" 
   width="700" %}

My experiment with this is Blue Pearmain,[^1] or BP, a newly open sourced framework for harmonizing metadata between Apple Photos and a Flickr Pro account. 

First & foremost, BP is an experiment in solving a particular itch that has been bugging me for years, but not to the point that I was motivated enough to actually do anything about it. I have a mishmash of albums in Apple Photos, and photosets in Flickr; I have photos on Flickr with titles & descriptions & tags, while most of the library in Apple Photos lacks such metadata. Apple has built machine-learning capabilities into Photos so that the software can identify faces & other attributes of the images.[^2] With BP, I have a tool that is scanning both libraries, cataloging what it finds in a local database, and providing me with a way to harmonize & update the metadata in both libraries.

{% include carousel.html images=page.carousel_images label="Blue Pearmain web UI screenshots" %}

BP is also an experiment in trying to bring some software engineering discipline to “vibe coding” a moderately complex project. “Vibe coding”, of course, has become notorious for producing unmaintainable “slop” software.  Recently, I’ve been defending against such problems by using [Jesse Vincent’s “Superpowers” plugin for Claude](https://blog.fsck.com/2025/10/09/superpowers/) to help ensure that best practices are being followed, but even before adding that tool to the mix, I was already making sure that the project was documented, code-reviewed, tested, and has a development roadmap laying out upcoming changes.

So is anybody else actually going to use this thing? Well, I don’t know, maybe, maybe not. The whole thing about producing open source software to “scratch an itch” is that other people don’t necessarily share the same itch. For me, harmonizing Flickr & Apple Photos helps resolve a long-standing peeve of mine, and if you happen to share that peeve, and if you think that a solution in the form of a web interface & a command line tool is up your alley, then I encourage you to give it a look. 

But I don’t really expect this to take the world by storm — that isn’t really the point. In this era where hyper-customized software is a chatbot session away (along with, of course, alarming carbon & water resource footprints, but let’s pretend we’re not bothered by such things[^3]), I think we’re moving beyond the days where off-the-shelf solutions, even open source ones, are going to be all that appealing for a lot of folks, when it’s just as easy to have your AI tool of choice come up with a bespoke solution for your own particular itch. 

And that’s what matters, right? These new AI agents can help us scratch these itches and build these tools, so that we can get back to doing the things we’d rather spend our time on — like, say, getting out there with a camera and a bike, to see what there is to see.

{% include image.html 
   path="/assets/images/blog/2026-05-12/Vivian-Maier-bike.png" 
   alt="Vivian Maier, bicycle rider" 
   caption="Vivian Maier, bicycle rider" 
   width="700" %}

[^1]: Why the heck is it called “Blue Pearmain”? The project is named for the [Blue Pearmain apple](https://en.wikipedia.org/wiki/Blue_Pearmain), an American variety mentioned by Henry David Thoreau in his 1862 essay [Wild Apples](https://www.gutenberg.org/cache/epub/4066/pg4066.txt). Why? Three reasons. First off, like [McIntosh](https://www.macworld.com/article/669214/how-the-macintosh-got-its-name.html), it’s a variety of apple, so it alludes to the company. But apples are commonly thought of as being red, or maybe yellow or green, so I liked that this variety of apples is “blue”, harkening to the colors of the [Flickr logo](https://www.flickrhelp.com/hc/en-us/articles/4404071066260-Brand-guidelines). Plus, it’s a meta-allusion to the proud literary & artistic history of Massachusetts. Yes, the name is a mouthful (ahem), so feel free to just call it “BP” if you prefer. 

[^2]: Apple’s automatic photo analysis capabilities have some limitations, to be sure — [see my post on how Photos handles concert detection](https://cdevers.github.io/2026/03/17/Where-Is-My-Mind.html), and no this isn’t fixed yet thankyouverymuch — but it’s still quite useful overall.

[^3]: Of course I’m bothered by the water & carbon footprint of LLMs, not to mention the huge number of data centers going up to support them. But the problem exists whether or not I personally am using these tools, and without this AI assistance, BP and projects like it never would have happened, so… it's complicated and I’m struggling with this.
