const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(bodyParser.json());
app.use(cors());

const commentsPostById = {};

app.get('/posts/:id/comments', (req, res) => {
  const comments = commentsPostById[req.params.id] || [];

  res.status(200).send(comments);
});

app.post('/posts/:id/comments', async (req, res) => {
  const commentId = randomBytes(4).toString('hex');
  const { content } = req.body;
  const comments = commentsPostById[req.params.id] || [];

  comments.push({ id: commentId, content, status: 'pending' });

  commentsPostById[req.params.id] = comments;

  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id
    }
  });
  res.status(201).send(comments);
});

app.post('/events', async (req, res) => {
  console.log('Event Received', req.body.type);

  const { type, data } = req.body;

  if (type === 'CommentModerated') {
    const { postId, id, status, content } = data;
    const comments = commentsPostById[postId];

    const comment = comments.find(comment => {
      return comment.id === id;
    });

    comment.status = status;

    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: {
        id,
        postId,
        status,
        content
      }
    });
  }

  res.send({});
});

app.listen(4002, () => {
  console.log('listening on 4002');
});
