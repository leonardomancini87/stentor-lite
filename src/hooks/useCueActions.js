import {
  updateCue as updateCueAction,
  updateTranslation as updateTranslationAction,
  deleteCue as deleteCueAction,
} from '../utils/subtitleActions.js';

import { useRef } from 'react';
import { planVoiceChange, applyVoiceChange } from '../utils/cueVoices.js';
import { voiceMessage } from '../utils/voiceMessages.js';
import { translate } from '../i18n/index.js';
import { setConfirmCueDelete, shouldConfirmCueDelete } from '../utils/confirmPreferences.js';

// Messaggi di errore delle funzioni sul copione → chiavi di traduzione.
const ERROR_KEYS = {
  'Sopratitolo non trovato.': 'error.notFound',
  'Non ci sono sopratitoli precedenti da unire.': 'error.noPrevious',
  'Non ci sono sopratitoli successivi da unire.': 'error.noNext',
  'Non puoi aggiungere un sopratitolo da un marcatore.': 'error.addFromMarker',
  'Questa azione non elimina i marcatori.': 'error.deleteMarker',
  'Deve rimanere almeno un sopratitolo.': 'error.lastCue',
  'Non puoi unire un sopratitolo con un marcatore.': 'error.mergeMarker',
  'Non puoi dividere un marcatore.': 'error.splitMarker',
  'Scelta non valida per le altre lingue.': 'error.invalidChoice',
  'Metti il cursore nel punto in cui vuoi dividere il sopratitolo.': 'error.cursor',
};

import { getNextCueId } from '../lib/cueOperations.js';
import { findNextPlayableIndex, getMarkerTitle, isMarkerCue } from '../utils/markers.js';
import {
  formatCueNumber,
  getCueNumbers,
  shiftIndexAfterInsert,
  shiftIndexAfterRemove,
  suggestMarkerTitle,
} from '../utils/showMap.js';
import { splitCueByLinesAction } from '../utils/cueSplit.js';
import { mergeCueWithPreviousAction } from '../utils/cueMerge.js';
import {
  createCueAfter as createCueAfterAction,
  deleteCueStructural,
  hasOtherLanguageText,
  mergeCueWithNextStructural,
  splitCueAtCursorStructural,
} from '../utils/cueStructure.js';

export function useCueActions({
  project,
  setProject,
  language,
  activeIndex,
  activeTextareaRef,
  setActiveIndex,
  projectedIndex,
  setProjectedIndex,
  setExpandedCueId,
  setEditingCue,
  dialogs,
  appLanguage = 'it',
}) {
  const voiceChangePending = useRef(false);
  const ui = (key, vars) => translate(appLanguage, key, vars);
  const errorText = (error) => (ERROR_KEYS[error] ? ui(ERROR_KEYS[error]) : error);
  const notPossible = ui('common.notPossible');
  const markerLabel = (type) => ui(`marker.type.${type}`);

  async function changeCueVoice(cueId, nextVoice) {
    if (voiceChangePending.current) return;
    const change = planVoiceChange(project, cueId, nextVoice);
    if (!change) return;
    voiceChangePending.current = true;
    try {
      let scope = 'single';
      if (change.needsChoice) {
        const t = (key, values) => voiceMessage(appLanguage, key, values);
        scope = await dialogs.choice({
          title: t(change.nextVoice ? 'renameTitle' : 'removeTitle'),
          message: t(change.nextVoice ? 'changeQuestion' : 'removeQuestion', { voice: change.previousVoice, count: change.count }),
          options: [
            { value: 'single', label: t('onlyThis'), selected: true },
            { value: 'all', label: t('allCues', { count: change.count }) },
          ],
          cancelLabel: t('cancel'),
          trapFocus: true,
          autoTranslate: false,
        });
      }
      if (scope === 'single' || scope === 'all') {
        // One immutable project update = one history/autosave transaction.
        setProject((current) => applyVoiceChange(current, change, scope));
      }
    } finally {
      voiceChangePending.current = false;
    }
  }
  function updateProject(patch) {
    setProject((current) => ({
      ...current,
      ...patch,
    }));
  }

  function updateCue(cueId, updater) {
    setProject((current) => updateCueAction(current, cueId, updater));
  }

  function updateTranslation(cueId, lang, value) {
    setProject((current) =>
      updateTranslationAction(current, cueId, lang, value)
    );
  }

  // Marcatori (Atto, Scena, Quadro, Intervallo…): segnano dove inizia una sezione
  // dello spettacolo e compongono la mappa. Non vengono mai proiettati.
  async function addMarker(beforeIndex = activeIndex) {
    const cues = project.cues || [];
    const insertIndex = Math.max(0, Math.min(Number.isInteger(beforeIndex) ? beforeIndex : activeIndex, cues.length));
    const numbers = getCueNumbers(cues);
    const nextNumber = numbers.slice(insertIndex).find((value) => value !== null);
    const result = await dialogs.marker({
      title: ui('marker.add.title'),
      message: nextNumber
        ? ui('marker.add.message.before', { number: formatCueNumber(nextNumber) })
        : ui('marker.add.message'),
      confirmLabel: ui('common.insert'),
      cancelLabel: ui('common.cancel'),
      defaultMarkerType: 'act',
      suggestTitle: (markerType) => suggestMarkerTitle(cues, markerType, insertIndex, markerLabel, ui('marker.default')),
      trapFocus: true,
    });

    if (!result) return;

    const markerType = result.markerType || 'other';
    const defaultTitle = markerType === 'other' ? ui('marker.default') : markerLabel(markerType);

    setProject((current) => {
      const at = Math.max(0, Math.min(insertIndex, current.cues.length));
      const newMarker = {
        id: getNextCueId(current.cues),
        type: 'marker',
        markerType,
        title: result.title || defaultTitle,
        speaker: '',
        original: '',
        translations: Object.fromEntries(
          current.languages.map((lang) => [lang, ''])
        ),
        note: '',
        startTime: null,
        endTime: null,
        renderStyle: 'normal',
      };

      const nextCues = [...current.cues];
      nextCues.splice(at, 0, newMarker);
      // La battuta in proiezione e quella selezionata restano le stesse: scorrono di una posizione.
      setActiveIndex((index) => shiftIndexAfterInsert(index, at));
      setProjectedIndex?.((index) => shiftIndexAfterInsert(index, at));
      setEditingCue?.(null);

      return {
        ...current,
        cues: nextCues,
      };
    });
  }

  async function editMarker(markerId) {
    const marker = project.cues.find((cue) => cue.id === markerId);
    if (!isMarkerCue(marker)) return;
    const result = await dialogs.marker({
      title: ui('marker.edit.title'),
      message: ui('marker.edit.message'),
      confirmLabel: ui('common.save'),
      cancelLabel: ui('common.cancel'),
      defaultMarkerType: marker.markerType || 'other',
      defaultTitle: getMarkerTitle(marker),
      trapFocus: true,
    });
    if (!result) return;
    setProject((current) => ({
      ...current,
      cues: current.cues.map((cue) => (
        cue.id === markerId
          ? { ...cue, markerType: result.markerType || 'other', title: result.title }
          : cue
      )),
    }));
  }

  async function deleteMarker(markerId) {
    const marker = project.cues.find((cue) => cue.id === markerId);
    if (!isMarkerCue(marker)) return;
    const confirmed = await dialogs.confirm({
      title: ui('marker.delete.title'),
      message: ui('marker.delete.message', { title: getMarkerTitle(marker) }),
      confirmLabel: ui('common.delete'),
      cancelLabel: ui('common.cancel'),
      variant: 'danger',
      trapFocus: true,
    });
    if (!confirmed) return;
    setProject((current) => {
      const removedIndex = current.cues.findIndex((cue) => cue.id === markerId);
      if (removedIndex < 0) return current;
      const nextCues = current.cues.filter((_, index) => index !== removedIndex);
      setActiveIndex((index) => findNextPlayableIndex(nextCues, shiftIndexAfterRemove(index, removedIndex)));
      setProjectedIndex?.((index) => shiftIndexAfterRemove(index, removedIndex));
      return { ...current, cues: nextCues };
    });
  }

  function addCue() {
    setProject((current) => {
      const insertIndex = Math.min(activeIndex + 1, current.cues.length);

      const newCue = {
        id: getNextCueId(current.cues),
        speaker: '',
        original: '',
        translations: Object.fromEntries(
          current.languages.map((lang) => [lang, ''])
        ),
        note: '',
        startTime: null,
        endTime: null,
        renderStyle: 'normal',
      };

      const cues = [...current.cues];
      cues.splice(insertIndex, 0, newCue);

      setActiveIndex(insertIndex);

      return {
        ...current,
        cues,
      };
    });
  }

  function addCueAfter(cueId) {
    setProject((current) => {
      const result = createCueAfterAction(current, cueId);
      if (result.error) {
        queueMicrotask(() => dialogs.alert({ title: notPossible, message: errorText(result.error) }));
        return current;
      }
      setProjectedIndex?.((index) => (index >= result.insertIndex ? index + 1 : index));
      setActiveIndex(result.insertIndex);
      setExpandedCueId?.(result.newCueId);
      setEditingCue?.(null);
      return result.project;
    });
  }

  async function deleteCueWithConfirm(cueId) {
    const cueIndex = project.cues.findIndex((cue) => cue.id === cueId);
    const cue = project.cues[cueIndex];
    if (!cue || isMarkerCue(cue)) return;
    if (project.cues.filter((item) => !isMarkerCue(item)).length <= 1) {
      await dialogs.alert({ title: notPossible, message: ui('error.lastCue') });
      return;
    }
    if (shouldConfirmCueDelete()) {
      const confirmed = await dialogs.confirm({
        title: ui('cue.delete.title'),
        message: ui('cue.delete.message', { number: String(cueIndex + 1).padStart(3, '0') }),
        confirmLabel: ui('common.delete'),
        cancelLabel: ui('common.cancel'),
        variant: 'danger',
        trapFocus: true,
        dontAskAgainLabel: ui('cue.delete.dontAsk'),
      });
      if (!confirmed) return;
      if (confirmed.dontAskAgain) setConfirmCueDelete(false);
    }

    setProject((current) => {
      const result = deleteCueStructural(current, cueId);
      if (result.error) return current;
      const nextIndex = findNextPlayableIndex(result.project.cues, result.deletedIndex);
      setActiveIndex(nextIndex);
      setProjectedIndex?.((index) => {
        if (index > result.deletedIndex) return index - 1;
        if (index === result.deletedIndex) return nextIndex;
        return index;
      });
      // Si torna all'elenco: la battuta successiva è selezionata, ma il suo editor resta chiuso.
      setExpandedCueId?.(null);
      setEditingCue?.(null);
      return result.project;
    });
  }

  async function mergeWithNext(cueId) {
    const cueIndex = project.cues.findIndex((cue) => cue.id === cueId);
    if (cueIndex < 0) return;
    const second = project.cues[cueIndex + 1];
    if (!second || isMarkerCue(project.cues[cueIndex]) || isMarkerCue(second)) {
      await dialogs.alert({ title: notPossible, message: ui(second ? 'error.mergeMarker' : 'error.noNext') });
      return;
    }

    setProject((current) => {
      const result = mergeCueWithNextStructural(current, cueId);
      if (result.error) return current;
      setActiveIndex(result.mergedIndex);
      setProjectedIndex?.((index) => {
        if (index === result.mergedIndex + 1) return result.mergedIndex;
        if (index > result.mergedIndex + 1) return index - 1;
        return index;
      });
      setExpandedCueId?.(result.mergedCueId);
      setEditingCue?.(null);
      return result.project;
    });
  }

  async function splitCueAtSelection(cueId, selection) {
    const selectedLanguage = selection?.language;
    const cursor = selection?.cursor;
    const fullText = selection?.fullText;
    if (!selectedLanguage || !Number.isInteger(cursor)) {
      await dialogs.alert({
        title: ui('cue.split.cursor.title'),
        message: ui('cue.split.cursor.message'),
      });
      return;
    }

    let otherLanguagesTarget = 'first';
    if (hasOtherLanguageText(project, cueId, selectedLanguage)) {
      const choice = await dialogs.choice({
        title: ui('cue.split.title'),
        message: ui('cue.split.message'),
        options: [
          { value: 'first', label: ui('cue.split.first'), selected: true, description: ui('cue.split.detail') },
          { value: 'second', label: ui('cue.split.second'), description: ui('cue.split.detail') },
        ],
        cancelLabel: ui('common.cancel'),
        trapFocus: true,
      });
      if (choice !== 'first' && choice !== 'second') return;
      otherLanguagesTarget = choice;
    }

    setProject((current) => {
      const result = splitCueAtCursorStructural({
        project: current,
        cueId,
        language: selectedLanguage,
        cursor,
        fullText,
        otherLanguagesTarget,
      });
      if (result.error) {
        queueMicrotask(() => dialogs.alert({ title: notPossible, message: errorText(result.error) }));
        return current;
      }
      setProjectedIndex?.((index) => (index > result.firstIndex ? index + 1 : index));
      setActiveIndex(result.secondIndex);
      setExpandedCueId?.(result.secondCueId);
      setEditingCue?.(null);
      return result.project;
    });
  }

  function deleteCue(cueId) {
    if (project.cues.length <= 1) return;

    setProject((current) => deleteCueAction(current, cueId));

    setActiveIndex((index) =>
      Math.max(0, Math.min(index, project.cues.length - 2))
    );
  }

  function splitCueAtCursor(cueId) {
    const textarea = activeTextareaRef.current;
    if (!textarea) {
      dialogs.alert({
        title: ui('cue.split.cursor.title'),
        message: ui('cue.split.cursor.message'),
      });
      return;
    }
    const storedCursor = Number.parseInt(textarea.dataset?.stentorSelectionStart, 10);
    const cursor = Number.isInteger(textarea.selectionStart)
      ? textarea.selectionStart
      : (Number.isInteger(storedCursor) ? storedCursor : null);
    const fullText = typeof textarea.value === 'string'
      ? textarea.value
      : String(textarea.innerText ?? textarea.textContent ?? '').replace(/\r\n?/g, '\n');
    return splitCueAtSelection(cueId, {
      language: textarea.dataset?.cueLanguage || language,
      cursor,
      fullText,
    });
  }

  function splitCue(cueId) {
    const result = splitCueByLinesAction({
      project,
      cueId,
      language,
    });

    if (result.error) {
      dialogs.alert({ title: notPossible, message: errorText(result.error) });
      return;
    }

    setProject(result.project);
    setActiveIndex(result.nextActiveIndex);
  }

  function mergeWithPrevious(cueId) {
    const result = mergeCueWithPreviousAction({
      project,
      cueId,
      language,
    });

    if (result.error) {
      dialogs.alert({ title: notPossible, message: errorText(result.error) });
      return;
    }

    setProject(result.project);
    setActiveIndex(result.nextActiveIndex);
  }

  function clearAllNotes() {
    setProject((current) => ({
      ...current,
      cues: current.cues.map((cue) => ({
        ...cue,
        note: '',
      })),
    }));
  }

  function clearEmptyCues() {
    setProject((current) => {
      const cues = current.cues.filter((cue) => {
        if (isMarkerCue(cue)) return true;

        const original = String(cue.original || '').trim();
        const translations = Object.values(cue.translations || {}).some((value) =>
          String(value || '').trim()
        );
        const note = String(cue.note || '').trim();

        return original || translations || note;
      });

      if (!cues.length) return current;

      setActiveIndex((index) => Math.max(0, Math.min(index, cues.length - 1)));

      return {
        ...current,
        cues,
      };
    });
  }

  function deleteCuesBySpeaker(speaker) {
    const normalizedSpeaker = String(speaker || '').trim();
    if (!normalizedSpeaker) return;

    setProject((current) => {
      const cues = current.cues.filter((cue) => {
        if (isMarkerCue(cue)) return true;
        return String(cue.speaker || '').trim() !== normalizedSpeaker;
      });

      if (!cues.length) return current;

      setActiveIndex((index) => Math.max(0, Math.min(index, cues.length - 1)));

      return {
        ...current,
        cues,
      };
    });
  }

  function getSpeakerCounts() {
    const counts = new Map();

    project.cues.forEach((cue) => {
      if (isMarkerCue(cue)) return;
      const speaker = String(cue.speaker || 'Nessuna voce').trim() || 'Nessuna voce';
      counts.set(speaker, (counts.get(speaker) || 0) + 1);
    });

    return [...counts.entries()]
      .map(([speaker, count]) => ({ speaker, count }))
      .sort((a, b) => a.speaker.localeCompare(b.speaker, 'it'));
  }

  return {
    updateProject,
    updateCue,
    updateTranslation,
    changeCueVoice,
    addCue,
    addCueAfter,
    addMarker,
    editMarker,
    deleteMarker,
    deleteCue,
    deleteCueWithConfirm,
    splitCue,
    splitCueAtCursor,
    splitCueAtSelection,
    mergeWithPrevious,
    mergeWithNext,
    clearAllNotes,
    clearEmptyCues,
    deleteCuesBySpeaker,
    getSpeakerCounts,
  };
}