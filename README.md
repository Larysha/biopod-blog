# The BioPod

A personal academic blog focused on computational biology, bioinformatics, and the messy reality of research. Built with Quarto and hosted on GitHub Pages.

**Live site:** [https://larysha.github.io/biopod-blog/](https://larysha.github.io/biopod-blog/)

---

## About This Blog

Hi - I'm Larysha - the BioPod is where I document my PhD research journey, share tutorials on computational methods, and write about the intersection of biology, data science, and climate adaptation. It's part learning log, part science communication experiment.

This blog serves as:
- A record of what I'm learning (mostly bioinformatics tools and methods)
- A platform for making computational biology more accessible
- Science communication practice
- General musings and ramblings 

---

## The BioPod Theme

This site uses a custom Quarto theme that I designed for readability and academic aesthetics. It features:

- **Warm colour palette:** Soft beige/cream tones (`#e0cdc5`, `#d5c3b3`) 
- **Custom typography:** Crimson Text for body text, Apricots display font for titles
- **Readable code blocks:** High contrast with bold text for clear syntax highlighting

### Using This Theme

You're welcome to use the BioPod theme as a starting point for your own Quarto site. Here's what you need:

**Required files:**
- `biopod-theme.scss` - The main theme file

**Optional files:**
- `fonts/apricots.woff2` - Custom display font (or download a different custom font)

**How to use it:**

1. Copy `biopod-theme.scss` to your Quarto project root
2. (Optional) Copy the `fonts/` directory
3. Update your `_quarto.yml`:
   ```yaml
   project:
     type: website
     resources:
       - fonts/  # Only if using custom fonts
   
   format:
     html:
       theme: biopod-theme.scss
   ```
4. Render your site: `quarto render`

**Please:**
- Make it your own - tweak colours, swap fonts, adjust spacing - personal sites should reflect the person behind them

### Customizing the Theme

Open `biopod-theme.scss` and edit the variables in the `/*-- scss:defaults --*/` section:

```scss
// Change colours
$bg-primary: #e0cdc5;      
$bg-secondary: #d5c3b3;    
$text-heading: #323619;    

// Change fonts
$font-family-sans-serif: 'Crimson Text', serif;  // Your preferred font
```

See the [blog post on setting up this site](https://larysha.github.io/biopod-blog/posts/quarto-setup/) for detailed walk-through.

---


## Tech Stack

- **Framework:** [Quarto](https://quarto.org/) (open-source scientific publishing system)
- **Styling:** Custom SCSS theme extending Bootstrap 5
- **Hosting:** GitHub Pages (free static hosting)
- **Deployment:** GitHub Actions (automated builds on push)
- **Version control:** Git + GitHub


---

## Contact & Connect

- **Blog:** [The BioPod](https://larysha.github.io/biopod-blog/)
- **Email:** [@Larysha](biopod.blog@gmail.com)

---

## License

The **theme** (`biopod-theme.scss`) is available for use with attribution to this repo

The **blog content** (posts, writing) is my own work and should not be reproduced without permission.

---

## Acknowledgments

Built with [Quarto](https://quarto.org/) by Posit. Hosted on [GitHub Pages](https://pages.github.com/).

---

*Last updated: December 2025*