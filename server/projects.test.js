import assert from 'node:assert/strict';
import test from 'node:test';
import { toProject } from './projects.js';

const repo = (o = {}) => ({ name: 'cloud-certification-dumps', html_url: 'https://github.com/u/cloud-certification-dumps', homepage: '', description: null, ...o });
const file = name => ({ type: 'file', name, download_url: `https://raw/${name}` });

test('title + description from "Name — text"', () => {
  const { project } = toProject(repo({ description: 'Cert Flashcards — Practise exam questions.' }), []);
  assert.equal(project.title, 'Cert Flashcards');
  assert.equal(project.description, 'Practise exam questions.');
});

test('falls back to the prettified repo name', () => {
  const { project } = toProject(repo({ description: 'Just a description' }), []);
  assert.equal(project.title, 'Cloud Certification Dumps');
  assert.equal(project.description, 'Just a description');
  assert.equal(toProject(repo(), []).project.description, '');
});

test('url prefers the homepage, else the repo', () => {
  assert.equal(toProject(repo({ homepage: 'https://app.example' }), []).project.url, 'https://app.example');
  assert.equal(toProject(repo(), []).project.url, 'https://github.com/u/cloud-certification-dumps');
});

test('video: demo.* wins, any mp4/webm otherwise, none without one', () => {
  const both = toProject(repo(), [file('clip.webm'), file('demo.mp4'), { type: 'dir', name: 'x.mp4' }]);
  assert.equal(both.video, 'https://raw/demo.mp4');
  assert.equal(both.project.video, '/api/video/cloud-certification-dumps');
  assert.equal(toProject(repo(), [file('clip.webm')]).video, 'https://raw/clip.webm');
  const none = toProject(repo(), [file('README.md')]);
  assert.equal(none.video, undefined);
  assert.equal('video' in none.project, false);
});
