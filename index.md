---
layout: page
---

Hello! I’m Chris Devers, a Boston-based, Emmy-award winning technologist. 

{% include image.html 
   path="/assets/images/cdevers_2023-12-01_emmy_award.jpeg" 
   alt="Me & my little Emmy friend." 
   caption="Here’s me holding the <a href='https://web.archive.org/web/20220126214327/https://theemmys.tv/tech-73rd-award-recipients/'>Technology & Engineering Emmy® Award for Cloud Enabled Remote Editing and Project Management</a> that <a href='https://editshare.com/editshare-receives-prestigious-emmy-award-for-technology-and-engineering/'>my team at EditShare earned in 2022</a>."
   width="600" %}

## Recent Posts

{% for post in site.posts limit:3 %}
### [{{ post.title }}]({{ post.url }})
<p class="post-meta">{{ post.date | date: "%B %-d, %Y" }}{% if post.tags.size > 0 %} &mdash; {% for tag in post.tags %}<span class="tag">{{ tag }}</span> {% endfor %}{% endif %}</p>
{{ post.excerpt }}
{% endfor %}

→ [All posts](/blog)

## Other Stuff

* [About](/about)
* [Blog](/blog) (<a href="{{ "/feed.xml" | relative_url }}">RSS</a>)
* [Books](/books)
* [Photos](/photography)
* [Projects](/projects)
* [Contact](/social)
