# Kiseki Record - Notes and Assumptions

## Assumptions
- **Local First, No Native Compilation:** As requested, strict adherence to pure JavaScript implementations. `@seald-io/nedb` was chosen as the storage engine over SQLite to guarantee zero `node-gyp` builds or VS Build Tools requirements on standard Windows.
- **Icon Rendering:** Used `png-to-ico` during the pre-build process to dynamically generate a multi-resolution `.ico` from the provided `icon.png`, making it easy to change without relying on global system utilities.
- **UI System:** The design uses `shadcn/ui` components based on Radix primitives and Tailwind CSS. This provides a highly premium and accessible desktop UI out of the box without any native dependencies.
- **AI Module (Ollama):** Given that the application is fully local and AI is optional, it communicates with Ollama via HTTP to `localhost:11434`. The core modules (Records, Journal) operate perfectly fine offline without Ollama running.

## Known Limitations / Future Enhancements
- **NeDB Scalability:** While `@seald-io/nedb` is fully functional and purely JavaScript, if the number of records exceeds hundreds of thousands, memory usage may increase (since NeDB keeps indexes in memory). It is suitable for personal scale apps.
- **File Management:** Copying large video attachments into managed storage may cause slight UI pauses as Electron transfers files via `fs`. Proper streaming or asynchronous queues can be introduced in later versions to alleviate this.
- **Rich Text Complexity:** The `tiptap` editor setup here is a Starter Kit. Features like embedded image rendering within the journal text require additional tiptap extensions not currently included.
