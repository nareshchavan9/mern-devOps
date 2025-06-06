const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Election = require('../models/Election');
const Vote = require('../models/Vote');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const crypto = require('crypto');

// Get all elections
router.get('/', async (req, res) => {
  try {
    const elections = await Election.find()
      .select('title description startDate endDate status candidates')
      .sort({ startDate: -1 });
    
    // Update status based on current date
    const updatedElections = elections.map(election => {
      const now = new Date();
      let status = election.status;
      
      if (now < election.startDate) {
        status = 'upcoming';
      } else if (now > election.endDate) {
        status = 'completed';
      } else {
        status = 'active';
      }
      
      return {
        ...election.toObject(),
        status
      };
    });
    
    res.json(updatedElections);
  } catch (error) {
    console.error('Get elections error:', error);
    res.status(500).json({ message: 'Server error fetching elections' });
  }
});

// Get election by ID
router.get('/:id', async (req, res) => {
  try {
    const electionId = req.params.id;
    console.log('Fetching election with ID:', electionId);

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      console.log('Invalid election ID format:', electionId);
      return res.status(400).json({ message: 'Invalid election ID format' });
    }

    const election = await Election.findById(electionId);
    console.log('Election found:', election ? 'Yes' : 'No');
    
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }
    
    // Update status based on current date
    const now = new Date();
    let status = election.status;
    
    if (now < election.startDate) {
      status = 'upcoming';
    } else if (now > election.endDate) {
      status = 'completed';
    } else {
      status = 'active';
    }
    
    const result = {
      ...election.toObject(),
      status
    };
    
    console.log('Returning election with status:', status);
    res.json(result);
  } catch (error) {
    console.error('Get election error:', error);
    
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid election ID format' });
    }
    
    res.status(500).json({ 
      message: 'Server error fetching election',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create new election
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, description, startDate, endDate, candidates } = req.body;
    
    console.log('Creating new election:', {
      title,
      startDate,
      endDate,
      candidatesCount: candidates?.length,
      adminId: req.user.id
    });

    // Validate required fields
    if (!title || !description || !startDate || !endDate || !candidates) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['title', 'description', 'startDate', 'endDate', 'candidates']
      });
    }

    // Validate candidates
    if (!Array.isArray(candidates) || candidates.length < 2) {
      return res.status(400).json({ message: 'At least two candidates are required' });
    }

    // Validate each candidate
    for (const candidate of candidates) {
      if (!candidate.name || !candidate.party || !candidate.bio) {
        return res.status(400).json({ 
          message: 'Each candidate must have name, party, and bio',
          invalidCandidate: candidate
        });
      }
    }
    
    // Validate dates
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    if (end <= start) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }
    
    // Determine initial status
    let status = 'upcoming';
    if (now > end) {
      status = 'completed';
    } else if (now >= start) {
      status = 'active';
    }

    // Create election with candidates
    const election = new Election({
      title,
      description,
      startDate: start,
      endDate: end,
      status,
      candidates: candidates.map(candidate => ({
        name: candidate.name,
        party: candidate.party,
        bio: candidate.bio
      })),
      createdBy: req.user.id
    });

    await election.save();
    
    console.log('Election created successfully:', {
      id: election._id,
      title: election.title,
      status: election.status
    });

    res.status(201).json(election);
  } catch (error) {
    console.error('Error creating election:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({ 
      message: 'Server error while creating election',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Cast a vote
router.post('/:id/vote', authenticateToken, async (req, res) => {
  try {
    const { candidateId } = req.body;
    const electionId = req.params.id;

    console.log('Vote request received:', {
      electionId,
      candidateId,
      userId: req.user.id
    });

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      console.log('Invalid election ID format:', electionId);
      return res.status(400).json({ message: 'Invalid election ID format' });
    }
    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
      console.log('Invalid candidate ID format:', candidateId);
      return res.status(400).json({ message: 'Invalid candidate ID format' });
    }
    
    // Find and validate election
    const election = await Election.findById(electionId);
    console.log('Election found:', election ? 'Yes' : 'No');
    
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }
    
    // Check if election is active
    const now = new Date();
    if (now < election.startDate || now > election.endDate) {
      return res.status(400).json({ message: 'This election is not currently active' });
    }
    
    // Check if candidate exists in this election
    const candidate = election.candidates.find(
      candidate => candidate._id.toString() === candidateId
    );
    
    if (!candidate) {
      console.log('Candidate not found in election:', {
        candidateId,
        availableCandidates: election.candidates.map(c => ({
          id: c._id.toString(),
          name: c.name
        }))
      });
      return res.status(400).json({ message: 'Invalid candidate for this election' });
    }
    
    // Check if user has already voted in this election
    const existingVote = await Vote.findOne({
      election: electionId,
      voter: req.user.id
    });
    
    if (existingVote) {
      return res.status(400).json({ message: 'You have already voted in this election' });
    }

    // Create and save the vote
    const vote = new Vote({
      election: electionId,
      candidate: candidateId,
      voter: req.user.id
    });
    
    await vote.save();
    
    console.log('Vote recorded successfully:', {
      electionId,
      candidateId,
      userId: req.user.id
    });

    res.status(201).json({ message: 'Vote recorded successfully' });
  } catch (error) {
    console.error('Vote submission error:', error);
    
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }
    
    res.status(500).json({ 
      message: 'Server error recording vote',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get vote status for current user
router.get('/:id/vote-status', authenticateToken, async (req, res) => {
  try {
    const electionId = req.params.id;
    const userId = req.user.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ message: 'Invalid election ID format' });
    }

    // Check if election exists
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    // Check if user has voted
    const vote = await Vote.findOne({
      election: electionId,
      voter: userId
    });

    let response = {
      hasVoted: !!vote,
      voteId: vote?._id
    };

    // If user has voted, include candidate details
    if (vote) {
      const candidate = election.candidates.find(
        c => c._id.toString() === vote.candidate.toString()
      );
      
      if (candidate) {
        response = {
          ...response,
          candidateId: candidate._id,
          candidateName: candidate.name,
          candidateParty: candidate.party
        };
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Get vote status error:', error);
    res.status(500).json({ 
      message: 'Server error checking vote status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete election
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const electionId = req.params.id;
    console.log('Delete request received for election:', electionId);

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      console.log('Invalid election ID format:', electionId);
      return res.status(400).json({ 
        message: 'Invalid election ID format',
        receivedId: electionId
      });
    }

    // Find election
    const election = await Election.findById(electionId);
    console.log('Election found:', election ? 'Yes' : 'No');
    
    if (!election) {
      console.log('Election not found with ID:', electionId);
      return res.status(404).json({ 
        message: 'Election not found',
        electionId: electionId
      });
    }

    // Check if election is active or completed
    const now = new Date();
    if (now >= election.startDate && now <= election.endDate) {
      console.log('Attempted to delete active election:', {
        electionId,
        startDate: election.startDate,
        endDate: election.endDate,
        currentTime: now
      });
      return res.status(400).json({ 
        message: 'Cannot delete an active election',
        startDate: election.startDate,
        endDate: election.endDate
      });
    }

    if (now > election.endDate) {
      console.log('Attempted to delete completed election:', {
        electionId,
        endDate: election.endDate,
        currentTime: now
      });
      return res.status(400).json({ 
        message: 'Cannot delete a completed election',
        endDate: election.endDate
      });
    }

    // Delete all votes associated with this election
    const deleteVotesResult = await Vote.deleteMany({ election: electionId });
    console.log('Deleted votes for election:', {
      electionId,
      deletedCount: deleteVotesResult.deletedCount
    });

    // Delete the election
    const deleteResult = await Election.findByIdAndDelete(electionId);
    console.log('Deleted election:', {
      electionId,
      success: !!deleteResult
    });

    res.json({ 
      message: 'Election deleted successfully',
      deletedElectionId: electionId,
      deletedVotesCount: deleteVotesResult.deletedCount
    });
  } catch (error) {
    console.error('Delete election error:', {
      error: error.message,
      stack: error.stack,
      electionId: req.params.id
    });
    
    res.status(500).json({ 
      message: 'Server error deleting election',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get election results (only for completed elections)
router.get('/:id/results', async (req, res) => {
  try {
    const electionId = req.params.id;
    console.log('Fetching results for election:', electionId);

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ message: 'Invalid election ID format' });
    }

    // Find election
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    // Check if election is completed
    const now = new Date();
    const isCompleted = now > election.endDate;
    
    if (!isCompleted) {
      return res.status(403).json({ 
        message: 'Results are not available until the election is complete',
        endDate: election.endDate
      });
    }

    // Get vote counts for each candidate
    const votes = await Vote.find({ election: electionId });
    const totalVotes = votes.length;

    // Create a map of candidate votes
    const voteMap = new Map();
    votes.forEach(vote => {
      const count = voteMap.get(vote.candidate.toString()) || 0;
      voteMap.set(vote.candidate.toString(), count + 1);
    });

    // Format results with candidate details
    const results = election.candidates.map(candidate => {
      const votes = voteMap.get(candidate._id.toString()) || 0;
      const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;

      return {
        candidate: {
          id: candidate._id,
          name: candidate.name,
          party: candidate.party,
          bio: candidate.bio
        },
        votes,
        percentage
      };
    });

    // Sort results by votes in descending order
    results.sort((a, b) => b.votes - a.votes);

    // Get winner(s)
    const maxVotes = Math.max(...results.map(r => r.votes));
    const winners = results
      .filter(r => r.votes === maxVotes)
      .map(r => r.candidate);

    const response = {
      electionId: election._id,
      title: election.title,
      description: election.description,
      totalVotes,
      results,
      winners,
      isTie: winners.length > 1,
      endDate: election.endDate,
      lastUpdated: new Date()
    };

    console.log('Sending results:', response);
    res.json(response);
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ 
      message: 'Server error fetching results',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update election
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const electionId = req.params.id;
    const { title, description, startDate, endDate, candidates } = req.body;
    
    console.log('Update request received for election:', {
      electionId,
      title,
      startDate,
      endDate,
      candidatesCount: candidates?.length
    });

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(electionId)) {
      return res.status(400).json({ message: 'Invalid election ID format' });
    }

    // Find election
    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    // Check if election is completed or active
    const now = new Date();
    if (now > election.endDate) {
      return res.status(400).json({ 
        message: 'Cannot update a completed election',
        endDate: election.endDate
      });
    }

    if (now >= election.startDate && now <= election.endDate) {
      return res.status(400).json({ 
        message: 'Cannot update an active election',
        startDate: election.startDate,
        endDate: election.endDate
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    if (end <= start) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Validate candidates if provided
    if (candidates) {
      if (!Array.isArray(candidates) || candidates.length < 2) {
        return res.status(400).json({ message: 'At least two candidates are required' });
      }

      // Validate each candidate
      for (const candidate of candidates) {
        if (!candidate.name || !candidate.party || !candidate.bio) {
          return res.status(400).json({ 
            message: 'Each candidate must have name, party, and bio',
            invalidCandidate: candidate
          });
        }
      }
    }

    // Update election
    const updateData = {
      title,
      description,
      startDate: start,
      endDate: end
    };

    if (candidates) {
      updateData.candidates = candidates.map(candidate => ({
        name: candidate.name,
        party: candidate.party,
        bio: candidate.bio,
        _id: candidate._id || new mongoose.Types.ObjectId()
      }));
    }

    const updatedElection = await Election.findByIdAndUpdate(
      electionId,
      { $set: updateData },
      { new: true }
    );

    console.log('Election updated successfully:', {
      id: updatedElection._id,
      title: updatedElection.title,
      candidatesCount: updatedElection.candidates.length
    });

    res.json(updatedElection);
  } catch (error) {
    console.error('Update election error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    res.status(500).json({ 
      message: 'Server error updating election',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
