import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Pause, Play, Download, Trash2, Edit2, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from '../hooks/use-toast';
import '../styles/NexusRecorder.css';

const NexusRecorder = () => {
  // Time state
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [timeAccumulated, setTimeAccumulated] = useState(0);
  const [recordings, setRecordings] = useState([]);
  
  // Transcription state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  
  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const recognitionRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load recordings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('nexus-recordings');
    if (saved) {
      setRecordings(JSON.parse(saved));
    }
  }, []);

  // Save recordings to localStorage
  useEffect(() => {
    if (recordings.length > 0) {
      localStorage.setItem('nexus-recordings', JSON.stringify(recordings));
    }
  }, [recordings]);

  // Initialize Web Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'fr-FR';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setTranscription(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        toast({
          title: "Erreur de transcription",
          description: "Impossible de transcrire l'audio",
          variant: "destructive"
        });
      };
    }
  }, []);

  // Format time for display
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const newRecording = {
          id: Date.now(),
          name: `Enregistrement ${recordings.length + 1}`,
          url: audioUrl,
          blob: audioBlob,
          duration: timeAccumulated,
          date: new Date().toLocaleString('fr-FR')
        };
        setRecordings(prev => [...prev, newRecording]);
        setTimeAccumulated(0);
        setRecordingTime(0);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();

      recordingIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingTime(timeAccumulated + elapsed);
      }, 1000);

      toast({
        title: "Enregistrement démarré",
        description: "Le microphone est actif"
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'accéder au microphone",
        variant: "destructive"
      });
    }
  };

  // Pause recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      clearInterval(recordingIntervalRef.current);
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setTimeAccumulated(prev => prev + elapsed);
      setIsPaused(true);
      
      toast({
        title: "Enregistrement en pause",
        description: "Cliquez sur Reprendre pour continuer"
      });
    }
  };

  // Resume recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      startTimeRef.current = Date.now();
      
      recordingIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingTime(timeAccumulated + elapsed);
      }, 1000);
      
      setIsPaused(false);
      
      toast({
        title: "Enregistrement repris",
        description: "Le microphone est actif"
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      clearInterval(recordingIntervalRef.current);
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setIsPaused(false);
      
      toast({
        title: "Enregistrement arrêté",
        description: "Fichier sauvegardé dans la liste"
      });
    }
  };

  // Start transcription
  const startTranscription = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsTranscribing(true);
        toast({
          title: "Transcription démarrée",
          description: "Parlez maintenant..."
        });
      } catch (error) {
        console.error('Error starting transcription:', error);
      }
    } else {
      toast({
        title: "Non supporté",
        description: "Votre navigateur ne supporte pas la reconnaissance vocale",
        variant: "destructive"
      });
    }
  };

  // Stop transcription
  const stopTranscription = () => {
    if (recognitionRef.current && isTranscribing) {
      recognitionRef.current.stop();
      setIsTranscribing(false);
      toast({
        title: "Transcription arrêtée",
        description: "Le texte a été sauvegardé"
      });
    }
  };

  // Download recording
  const downloadRecording = (recording) => {
    const link = document.createElement('a');
    link.href = recording.url;
    link.download = `${recording.name}.webm`;
    link.click();
    
    toast({
      title: "Téléchargement",
      description: `${recording.name} téléchargé`
    });
  };

  // Delete recording
  const deleteRecording = (id) => {
    setRecordings(prev => prev.filter(r => r.id !== id));
    toast({
      title: "Supprimé",
      description: "Enregistrement supprimé"
    });
  };

  // Start editing name
  const startEditing = (recording) => {
    setEditingId(recording.id);
    setEditingName(recording.name);
  };

  // Save edited name
  const saveEdit = (id) => {
    setRecordings(prev => prev.map(r => 
      r.id === id ? { ...r, name: editingName } : r
    ));
    setEditingId(null);
    setEditingName('');
    
    toast({
      title: "Modifié",
      description: "Nom mis à jour"
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div className="nexus-container">
      {/* Animated background */}
      <div className="nexus-bg"></div>
      
      {/* Header with clock */}
      <header className="nexus-header">
        <div className="clock-display">
          <div className="clock-time">
            {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="clock-date">
            {currentTime.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <h1 className="nexus-title">
          <span className="title-glow">NEXUS</span>
          <span className="title-sub">RECORDER</span>
        </h1>
      </header>

      {/* Main content */}
      <main className="nexus-main">
        {/* Audio Recording Section */}
        <section className="nexus-section recording-section">
          <div className="section-header">
            <Mic className="section-icon" />
            <h2>Enregistrement Audio</h2>
          </div>
          
          <div className="recording-controls">
            <div className="timer-display">
              {formatTime(recordingTime)}
            </div>
            
            <div className="control-buttons">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  className="control-btn start-btn"
                  size="lg"
                >
                  <Mic className="btn-icon" />
                  Démarrer
                </Button>
              ) : (
                <>
                  {!isPaused ? (
                    <Button
                      onClick={pauseRecording}
                      className="control-btn pause-btn"
                      size="lg"
                    >
                      <Pause className="btn-icon" />
                      Pause
                    </Button>
                  ) : (
                    <Button
                      onClick={resumeRecording}
                      className="control-btn resume-btn"
                      size="lg"
                    >
                      <Play className="btn-icon" />
                      Reprendre
                    </Button>
                  )}
                  <Button
                    onClick={stopRecording}
                    className="control-btn stop-btn"
                    size="lg"
                  >
                    <Square className="btn-icon" />
                    Arrêter
                  </Button>
                </>
              )}
            </div>
            
            {isRecording && (
              <div className="recording-indicator">
                <span className="pulse-dot"></span>
                {isPaused ? 'EN PAUSE' : 'ENREGISTREMENT EN COURS'}
              </div>
            )}
          </div>
        </section>

        {/* Transcription Section */}
        <section className="nexus-section transcription-section">
          <div className="section-header">
            <h2>Transcription Vocale Instantanée</h2>
          </div>
          
          <div className="transcription-controls">
            <div className="control-buttons">
              {!isTranscribing ? (
                <Button
                  onClick={startTranscription}
                  className="control-btn transcribe-btn"
                  size="lg"
                >
                  <Mic className="btn-icon" />
                  Démarrer la transcription
                </Button>
              ) : (
                <Button
                  onClick={stopTranscription}
                  className="control-btn stop-transcribe-btn"
                  size="lg"
                >
                  <Square className="btn-icon" />
                  Arrêter la transcription
                </Button>
              )}
            </div>
            
            {isTranscribing && (
              <div className="transcribing-indicator">
                <span className="pulse-dot"></span>
                TRANSCRIPTION EN COURS
              </div>
            )}
            
            <div className="transcription-box">
              <textarea
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                placeholder="Le texte transcrit apparaîtra ici en temps réel..."
                className="transcription-textarea"
              />
            </div>
          </div>
        </section>

        {/* Recordings List */}
        <section className="nexus-section recordings-section">
          <div className="section-header">
            <h2>Enregistrements Sauvegardés ({recordings.length})</h2>
          </div>
          
          {recordings.length === 0 ? (
            <div className="empty-state">
              <p>Aucun enregistrement pour le moment</p>
              <p className="empty-sub">Commencez votre premier enregistrement ci-dessus</p>
            </div>
          ) : (
            <div className="recordings-list">
              {recordings.map(recording => (
                <div key={recording.id} className="recording-item">
                  <div className="recording-info">
                    {editingId === recording.id ? (
                      <div className="edit-name-container">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="edit-name-input"
                          autoFocus
                        />
                        <div className="edit-actions">
                          <Button
                            onClick={() => saveEdit(recording.id)}
                            className="edit-action-btn save-btn"
                            size="sm"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={cancelEdit}
                            className="edit-action-btn cancel-btn"
                            size="sm"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="recording-name">{recording.name}</div>
                        <div className="recording-meta">
                          <span>{formatTime(recording.duration)}</span>
                          <span className="meta-separator">•</span>
                          <span>{recording.date}</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {editingId !== recording.id && (
                    <>
                      <audio src={recording.url} controls className="recording-audio" />
                      
                      <div className="recording-actions">
                        <Button
                          onClick={() => startEditing(recording)}
                          className="action-btn edit-btn"
                          size="sm"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => downloadRecording(recording)}
                          className="action-btn download-btn"
                          size="sm"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => deleteRecording(recording.id)}
                          className="action-btn delete-btn"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="nexus-footer">
        <p>NEXUS RECORDER © {new Date().getFullYear()} - Powered by Web APIs</p>
      </footer>
    </div>
  );
};

export default NexusRecorder;