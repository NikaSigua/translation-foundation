# Translation Foundation · თარგმანის ფონდი

Film subtitles in Georgian and English, made by volunteers a few minutes at a time. This repository holds every subtitle file; [translation.foundation.ge](https://translation.foundation.ge/en/) shows how far each film has got and where to continue.

[ქართულად ქვემოთ ↓](#ქართულად)

## How to help

You need a free GitHub account. Everything happens in your browser.

1. **Pick a film** on [translation.foundation.ge](https://translation.foundation.ge/en/). Its page shows where to continue, for example "subtitle 5, at 2:05", and has a link to watch the film from that moment.
2. **Say which part you're taking** in the film's issue on GitHub (linked from the film page), for example "I'm doing 5–20". That way nobody translates the same part twice.
3. **Click "Edit on GitHub"** on the film page. GitHub opens the subtitle file. The first time, it asks to make your own copy of the project (a "fork"): say yes.
4. **Find your starting subtitle** (⌘F or Ctrl+F, search for its number) and replace the English text with Georgian. Keep the number and the time line exactly as they are:

   ```
   5
   00:02:05,250 --> 00:02:06,300
   გმადლობ.
   ```

5. **Save when you like.** Even five subtitles help. Click **Commit changes…**, write what you did (for example "Sintel: 5–20"), then **Propose changes** and **Create pull request**.
6. **That's it.** A maintainer checks your part and adds it. The website then shows the new progress, and the next person starts after your last subtitle.

No GitHub account? Email your subtitles to [translation@foundation.ge](mailto:translation@foundation.ge), saying which film and which numbers.

### Working with the video: Aegisub

[Aegisub](https://aegisub.org/) is a free subtitle editor for Windows, macOS and Linux. It plays the film next to the subtitles, so it's the best tool for longer sessions and for writing down a film's dialogue with exact times.

1. Install Aegisub from [aegisub.org](https://aegisub.org/downloads/).
2. From the film's page, download the latest subtitle file and the video.
3. In Aegisub, open both: **File → Open Subtitles**, then **Video → Open Video**.
4. To translate, use **Subtitle → Translation Assistant**: it shows each original line and you type the translation, starting at the subtitle the film page gives. To write down dialogue, add a line for each sentence and set its times on the audio waveform.
5. Save with **File → Export Subtitles…** as SubRip (`.srt`), keeping the same file name, for example `ka.srt`.
6. On GitHub, open the film's folder and choose **Add file → Upload files**, drop in your file, then **Propose changes** and **Create pull request**.

An upload can never undo anyone else's work: if someone added subtitles while you were working, the automatic check says so, and you add your part to the latest file instead.

### Rules

- Only films that may be translated: in the public domain, under an open licence, or with the rights holder's written permission. Each film's folder says which.
- Keep every number and time. One translated subtitle for each original one.
- At most 2 lines of 42 characters per subtitle. Georgian quotation marks „like this“.
- Translate the meaning, in natural language. Names in Georgian as they sound: Thom → თომი.
- An automatic check runs on every pull request and points out anything broken.

## ქართულად

### როგორ დავეხმაროთ

საჭიროა უფასო GitHub-ის ანგარიში. ყველაფერი ბრაუზერში ხდება.

1. **აირჩიეთ ფილმი** [translation.foundation.ge](https://translation.foundation.ge/)-ზე. ფილმის გვერდზე ჩანს, საიდან უნდა გააგრძელოთ, მაგალითად: „სუბტიტრი 5, 2:05-ზე“, და ბმული, რომლითაც ფილმს სწორედ იმ მომენტიდან ნახავთ.
2. **მიუთითეთ, რომელ ნაწილს იღებთ**, ფილმის issue-ში GitHub-ზე (ბმული ფილმის გვერდზეა), მაგალითად: „ვთარგმნი 5–20-ს“. ასე ერთსა და იმავე ნაწილს ორი ადამიანი არ თარგმნის.
3. **დააჭირეთ „Edit on GitHub“-ს** ფილმის გვერდზე. GitHub სუბტიტრების ფაილს გახსნის. პირველად ის პროექტის საკუთარი ასლის („fork“) შექმნას შემოგთავაზებთ: დაეთანხმეთ.
4. **იპოვეთ საწყისი სუბტიტრი** (⌘F ან Ctrl+F, მოძებნეთ მისი ნომერი) და ინგლისური ტექსტი ქართულით ჩაანაცვლეთ. ნომერი და დროის ხაზი ზუსტად ისე დატოვეთ, როგორც არის.
5. **შეინახეთ, როცა გინდათ.** ხუთი სუბტიტრიც კი დიდი დახმარებაა. დააჭირეთ **Commit changes…**-ს, მიუთითეთ, რა გააკეთეთ (მაგალითად: „სინტელი: 5–20“), შემდეგ **Propose changes**-სა და **Create pull request**-ს.
6. **სულ ესაა.** მოდერატორი თქვენს ნაწილს შეამოწმებს და დაამატებს. საიტზე ახალი პროგრესი გამოჩნდება, შემდეგი ადამიანი კი თქვენი ბოლო სუბტიტრის შემდეგ გააგრძელებს.

GitHub-ის ანგარიში არ გაქვთ? სუბტიტრები გამოგზავნეთ მისამართზე [translation@foundation.ge](mailto:translation@foundation.ge) და მიუთითეთ ფილმი და ნომრები.

### ვიდეოსთან ერთად მუშაობა: Aegisub

[Aegisub](https://aegisub.org/) უფასო სუბტიტრების რედაქტორია Windows-ის, macOS-ისა და Linux-ისთვის. ის ფილმს სუბტიტრების გვერდით უშვებს, ამიტომ ხანგრძლივი მუშაობისთვისა და ფილმის დიალოგების ზუსტი დროით ჩასაწერად საუკეთესო საშუალებაა.

1. დააინსტალირეთ Aegisub [aegisub.org](https://aegisub.org/downloads/)-დან.
2. ფილმის გვერდიდან ჩამოტვირთეთ სუბტიტრების ბოლო ვერსია და ვიდეო.
3. Aegisub-ში გახსენით ორივე: **File → Open Subtitles**, შემდეგ **Video → Open Video**.
4. სათარგმნად გამოიყენეთ **Subtitle → Translation Assistant**: ის ორიგინალის თითოეულ სტრიქონს გაჩვენებთ, თქვენ კი თარგმანს წერთ, იმ სუბტიტრიდან დაწყებული, რომელსაც ფილმის გვერდი მიუთითებს. დიალოგების ჩასაწერად თითოეული წინადადებისთვის დაამატეთ სტრიქონი და მისი დრო აუდიოს ტალღაზე დააყენეთ.
5. შეინახეთ **File → Export Subtitles…**-ით, SubRip (`.srt`) ფორმატში, იმავე სახელით, მაგალითად `ka.srt`.
6. GitHub-ზე გახსენით ფილმის საქაღალდე, აირჩიეთ **Add file → Upload files**, ჩააგდეთ ფაილი, შემდეგ კი დააჭირეთ **Propose changes**-სა და **Create pull request**-ს.

ატვირთვა სხვის ნამუშევარს ვერასოდეს წაშლის: თუ თქვენი მუშაობისას ვინმემ სუბტიტრები დაამატა, ავტომატური შემოწმება ამას გეტყვით და თქვენს ნაწილს ბოლო ვერსიას დაამატებთ.

## For maintainers

- Merge a pull request once the check passes and the translation reads well. If the check says a change would undo someone's work, ask the person to add their part to the latest file.
- **Adding a film:**
  1. Check that it may be translated (public domain, an open licence, or written permission), and search [OpenSubtitles](https://www.opensubtitles.org/) for the language you want, so nobody redoes subtitles that already exist. Don't copy files from there: they rarely have a licence.
  2. Create its folder in `films/`. If official subtitles exist under an open licence, add them as the source (for example `en.srt`) and start the translation as a copy of it.
  3. Add the film to [`films/films.json`](films/films.json), with its IMDb id and the video the times match.
  4. Open an issue called "Film name: who's doing what", and put its number in `films.json`.

  Films that need permission get `"status": "waiting"` until the rights holder agrees. The letter to send is in [PERMISSION-LETTER.md](PERMISSION-LETTER.md).
- **When a film is finished,** share the file where viewers will find it: upload it to [OpenSubtitles](https://www.opensubtitles.org/), which video players such as VLC and Kodi search automatically, and, for openly licensed films, to [Wikimedia Commons](https://commons.wikimedia.org/wiki/Commons:Timed_Text). Credit the translators and the CC BY-SA 4.0 licence.
- The website is in [`website/`](website/).

## Licence

- Subtitle files in `films/`: [CC BY-SA 4.0](LICENSE-SUBTITLES.md), except the official reference files named in each film's README, which keep their own licence.
- Website code: [MIT](LICENSE).
- The films belong to their rights holders.
