updateArray=(3000 4000 5000 6000 7000 8000 9000 10000 11000 12000 13000 14000 15000 16000)
updateLength=${#updateArray[@]}
echo ArrayLength $updateLength
for (( i = 0; i < $(($updateLength-1)); i++ )); do
  if [[ $((${updateArray[i]}-${updateArray[$((i+1))]})) > 0  ]]; then
    echo FALSE ${updateArray[i]} ${updateArray[$((i+1))]}
  else
    echo OK! ${updateArray[i]} ${updateArray[$((i+1))]}
  fi
done
