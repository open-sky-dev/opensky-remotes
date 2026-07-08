import { docSections } from './nav'

// Written by the sidebar's scrollspy, read anywhere the current section matters
export const navState = $state({ active: docSections[0].id })
