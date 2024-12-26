# For contributors:
**By submitting a pull request to this project, 
you agree to license your contribution under the MIT license 
to this project.**

# Dulvit
*ATH. að pakkinn er alls ekki tilbúinn. Það á eftir að bæta heilmiklu við hann og laga ýmsa hluti. Ekki er hægt að tryggja að allt saman sé 100% rétt á þessum tímapunkti.*


## 1.  Hvað er Dulvit?
Dulvit er einfaldur og þæginlegur en á sama tíma hægvirkur og umfangslítill pakki til að búa til, þjálfa og nota tauganet í Javascript.

## 2.  Hvernig virkar pakkinn?
Byrjað er á að sækja nokkra smiði úr **nn.js**, t.d. ```Model, Dense``` og ```SquareLoss``` (einnig til ```Softmax```):
```javascript
const {
  Model,
  Dense,
  SquareLoss
} = NN;
```

Svo er notað þá til að gera líkan svona:

```javascript
m = new Model(4, new SquareLoss());
m.addLayer(new Dense(2, 'swish')); // Hér er swish virkjunarfall lagsins
m.addLayer(new Dense(1));
```

Til að þjálfa líkanið er keyrt:
```javascript
let [trainLosses, validationLosses] = m.train(xTrain, yTrain, options);
```

Þar sem ```xTrain``` og ```yTrain``` eru af gerðinni ```Matrix``` úr **gv.js** og ```options``` er hlutur sem inniheldur einhverjar stillingar eins og t.d.:
```javascript
{
  minEpochs: 10,
  maxEpochs: 10,
  batchSize: 4,
  lr: 0.001,
  lrDecay: 0.99
}
```


### Matrix
Matrix úr gv.js tekur inn fylki af fylkjum:
```javascript
let mat = new Matrix([[1, 2], [3, 4]])
```

### Vector
Vector úr gv.js tekur inn fylki af gildum:
```javascript
let vec = new Vector([1, 2, 3, 4])
```

*Athugið að þegar gildi í mat eru uppfærð þarf að passa að uppfæra líka ```mat.rows``` og eins með ```vec.values``` fyrir ```Vector``` gildi.*

## 3. Nánari skjölun
Nánari skjölun síðar.
