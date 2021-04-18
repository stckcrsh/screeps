# Helpful CLI commands

## Reset all data 

```
system.resetAllData()
```

## Complete all construction

```
storage.db['rooms.objects'].update({ type: 'constructionSite' },{ $set: { progress: 99999 }})
```

## add energy to spawn

```
storage.db['rooms.objects'].update({type:'spawn', room:'W8N3'}, {$set:{store:{energy:300}}})
```